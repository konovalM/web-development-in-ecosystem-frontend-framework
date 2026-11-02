import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import type {
  CreateVideoDto,
  UpdateVideoDto,
  FilterVideoDto,
} from './dto/index.js';
const projection = `v.id,v.title,v.description,v.status,v.size_bytes AS "sizeBytes",v.created_at AS "createdAt",v.published_at AS "publishedAt",v.comments_enabled AS "commentsEnabled",v.playback_url AS "playbackUrl",c.id AS "channelId",c.title AS "channelTitle",u.display_name AS author`;
const joins =
  ' FROM videos v JOIN channels c ON c.id=v.channel_id JOIN users u ON u.id=c.owner_id ';
@Injectable()
export class VideoService {
  constructor(private readonly db: DataSource) {}
  async create(dto: CreateVideoDto, user: number) {
    if (BigInt(dto.sizeBytes) > 9223372036854775807n)
      throw new BadRequestException('sizeBytes exceeds PostgreSQL bigint');
    try {
      return await this.db.transaction(async (m) => {
        const [channel] = await m.query(
          'SELECT owner_id FROM channels WHERE id=$1',
          [dto.channelId],
        );
        if (!channel) throw new BadRequestException('Unknown channel');
        if (channel.owner_id !== user) throw new ForbiddenException();
        const result = await m
          .createQueryBuilder()
          .update('channels')
          .set({ used_bytes: () => 'used_bytes + :size' })
          .where(
            'id=:id AND owner_id=:user AND quota_bytes-used_bytes >= :size::bigint',
            { id: dto.channelId, user, size: dto.sizeBytes },
          )
          .returning('id')
          .execute();
        if (result.affected !== 1)
          throw new ConflictException('Channel quota exceeded');
        const [v] = await m.query(
          `INSERT INTO videos(channel_id,title,description,size_bytes,storage_key,comments_enabled,playback_url) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [
            dto.channelId,
            dto.title,
            dto.description ?? null,
            dto.sizeBytes,
            randomUUID(),
            dto.commentsEnabled ?? true,
            dto.playbackUrl ?? null,
          ],
        );
        for (const tag of dto.tagIds)
          await m.query(
            'INSERT INTO video_tags(video_id,tag_id) VALUES($1,$2)',
            [v.id, tag],
          );
        const [row] = await m.query(
          'SELECT ' + projection + joins + ' WHERE v.id=$1',
          [v.id],
        );
        return row;
      });
    } catch (e) {
      const err = e as { code?: string; constraint?: string };
      if (err.code === '23503' && err.constraint === 'fk_vt_tag')
        throw new BadRequestException('Unknown tag');
      throw e;
    }
  }
  async findAll(filter: FilterVideoDto = {}, owner?: number) {
    const params: unknown[] = [];
    const where = owner ? ['c.owner_id=$1'] : ["v.status='published'"];
    if (owner) params.push(owner);
    const orderDate = owner ? 'v.created_at' : 'v.published_at';
    if (filter.channelId) {
      params.push(filter.channelId);
      where.push('v.channel_id=$' + params.length);
    }
    if (filter.q) {
      params.push('%' + filter.q.replace(/[\\%_]/g, '\\$&') + '%');
      where.push('v.title ILIKE $' + params.length);
    }
    if (filter.cursor) {
      try {
        const c = JSON.parse(
          Buffer.from(filter.cursor, 'base64url').toString(),
        );
        if (
          typeof c.at !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(c.at) ||
          !Number.isFinite(Date.parse(c.at)) ||
          !Number.isSafeInteger(c.id) ||
          c.id < 1 ||
          c.id > 2147483647 ||
          new Date(c.at).toISOString() !== c.at
        )
          throw Error();
        params.push(c.at, c.id);
        where.push(
          `(${orderDate},v.id)<($${params.length - 1}::timestamptz,$${params.length}::integer)`,
        );
      } catch {
        throw new BadRequestException('Invalid cursor');
      }
    }
    params.push(filter.limit ?? 20);
    const items = await this.db.query(
      'SELECT ' +
        projection +
        joins +
        ' WHERE ' +
        where.join(' AND ') +
        ` ORDER BY ${orderDate} DESC,v.id DESC LIMIT $` +
        params.length,
      params,
    );
    // Page first, then batch tags: exactly two SQL commands for any non-empty page.
    if (items.length) {
      const tags = await this.db.query(
        'SELECT vt.video_id,t.id,t.name FROM video_tags vt JOIN tags t ON t.id=vt.tag_id WHERE vt.video_id=ANY($1::integer[]) ORDER BY t.id',
        [items.map((v: { id: number }) => v.id)],
      );
      for (const v of items)
        v.tags = tags
          .filter((t: { video_id: number }) => t.video_id === v.id)
          .map((t: { id: number; name: string }) => ({
            id: t.id,
            name: t.name,
          }));
    }
    const last = items.at(-1);
    return {
      items,
      nextCursor: last
        ? Buffer.from(
            JSON.stringify({
              at: (owner ? last.createdAt : last.publishedAt).toISOString(),
              id: last.id,
            }),
          ).toString('base64url')
        : null,
    };
  }
  async findOne(id: number, user?: number) {
    const [v] = await this.db.query(
      'SELECT ' +
        projection +
        ',c.owner_id AS "ownerId"' +
        joins +
        ' WHERE v.id=$1',
      [id],
    );
    if (!v || (v.status !== 'published' && v.ownerId !== user))
      throw new NotFoundException();
    delete v.ownerId;
    v.tags = await this.db.query(
      'SELECT t.id,t.name FROM video_tags vt JOIN tags t ON t.id=vt.tag_id WHERE vt.video_id=$1 ORDER BY t.name,t.id',
      [id],
    );
    return v;
  }
  private async owned(id: number, user: number) {
    const [v] = await this.db.query(
      'SELECT v.id,v.status,c.owner_id FROM videos v JOIN channels c ON c.id=v.channel_id WHERE v.id=$1',
      [id],
    );
    if (!v) throw new NotFoundException();
    if (v.owner_id !== user) throw new ForbiddenException();
    return v;
  }
  async update(id: number, dto: UpdateVideoDto, user: number) {
    await this.db.transaction(async (m) => {
      const [video] = await m.query(
        'SELECT c.owner_id FROM videos v JOIN channels c ON c.id=v.channel_id WHERE v.id=$1 FOR UPDATE OF v',
        [id],
      );
      if (!video) throw new NotFoundException();
      if (video.owner_id !== user) throw new ForbiddenException();
      await m.query(
        'UPDATE videos SET title=COALESCE($2,title),description=CASE WHEN $4 THEN $3 ELSE description END,comments_enabled=COALESCE($5,comments_enabled),playback_url=CASE WHEN $7 THEN $6 ELSE playback_url END WHERE id=$1',
        [
          id,
          dto.title ?? null,
          dto.description ?? null,
          dto.description !== undefined,
          dto.commentsEnabled ?? null,
          dto.playbackUrl ?? null,
          dto.playbackUrl !== undefined,
        ],
      );
      if (dto.tagIds) {
        await m.query('DELETE FROM video_tags WHERE video_id=$1', [id]);
        for (const tag of dto.tagIds)
          await m.query('INSERT INTO video_tags VALUES($1,$2)', [id, tag]);
      }
    });
    return this.findOne(id, user);
  }
  async status(id: number, status: string, user: number) {
    await this.owned(id, user);
    await this.db.query(
      `UPDATE videos SET status=$2,published_at=CASE WHEN $2='published' THEN COALESCE(published_at,now()) ELSE published_at END WHERE id=$1`,
      [id, status],
    );
    return this.findOne(id, user);
  }
}
