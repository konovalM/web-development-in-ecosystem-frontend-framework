import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import type { ChannelDto, UserDto } from './library.dto.js';
@Injectable()
export class LibraryService {
  constructor(private readonly db: DataSource) {}
  users() {
    return this.db.query(
      'SELECT id,display_name AS "displayName",email,created_at AS "createdAt" FROM users ORDER BY id',
    );
  }
  async createUser(dto: UserDto) {
    const [u] = await this.db.query(
      'INSERT INTO users(display_name,email) VALUES($1,$2) RETURNING id,display_name AS "displayName",email',
      [dto.displayName, dto.email],
    );
    return u;
  }
  async profile(user: number, dto: UserDto) {
    const [u] = await this.db.query(
      'UPDATE users SET display_name=$2,email=$3 WHERE id=$1 RETURNING id,display_name AS "displayName",email',
      [user, dto.displayName, dto.email],
    );
    return u;
  }
  async deleteUser(user: number) {
    await this.db.transaction(async (m) => {
      await m.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');
      if (Number((await m.query('SELECT count(*) FROM users'))[0].count) <= 1)
        throw new ConflictException(
          'Нельзя удалить последнего demo-пользователя',
        );
      await m.query('DELETE FROM users WHERE id=$1', [user]);
    });
  }
  channels() {
    return this.db.query(
      `SELECT c.id,c.title,c.owner_id AS "ownerId",u.display_name AS "ownerName",c.quota_bytes AS "quotaBytes",c.used_bytes AS "usedBytes",(c.quota_bytes-c.used_bytes)::text AS "remainingBytes",count(v.id)::integer AS "videoCount" FROM channels c JOIN users u ON u.id=c.owner_id LEFT JOIN videos v ON v.channel_id=c.id GROUP BY c.id,u.id ORDER BY c.id`,
    );
  }
  async createChannel(user: number, dto: ChannelDto) {
    if (BigInt(dto.quotaBytes) > 9223372036854775807n)
      throw new BadRequestException('Quota exceeds PostgreSQL bigint');
    const [c] = await this.db.query(
      'INSERT INTO channels(owner_id,title,quota_bytes) VALUES($1,$2,$3) RETURNING id,title',
      [user, dto.title, dto.quotaBytes],
    );
    return c;
  }
  private async ownChannel(m: EntityManager, id: number, user: number) {
    const [c] = await m.query(
      'SELECT owner_id FROM channels WHERE id=$1 FOR UPDATE',
      [id],
    );
    if (!c) throw new NotFoundException();
    if (c.owner_id !== user) throw new ForbiddenException();
  }
  async renameChannel(id: number, user: number, title: string) {
    return this.db.transaction(async (m) => {
      await this.ownChannel(m, id, user);
      await m.query('UPDATE channels SET title=$2 WHERE id=$1', [id, title]);
      return { id, title };
    });
  }
  async deleteChannel(id: number, user: number) {
    await this.db.transaction(async (m) => {
      await this.ownChannel(m, id, user);
      await m.query('DELETE FROM channels WHERE id=$1', [id]);
    });
  }
  tags() {
    return this.db.query(
      'SELECT t.id,t.name,count(vt.video_id)::integer AS "videoCount" FROM tags t LEFT JOIN video_tags vt ON vt.tag_id=t.id GROUP BY t.id ORDER BY t.name,t.id',
    );
  }
  async createTag(name: string) {
    const [t] = await this.db.query(
      'INSERT INTO tags(name) VALUES($1) RETURNING id,name',
      [name],
    );
    return t;
  }
  async renameTag(id: number, name: string) {
    const [t] = await this.db.query(
      'UPDATE tags SET name=$2 WHERE id=$1 RETURNING id,name',
      [id, name],
    );
    if (!t) throw new NotFoundException();
    return t;
  }
  async deleteTag(id: number) {
    await this.db.transaction(async (m) => {
      const [t] = await m.query('SELECT id FROM tags WHERE id=$1 FOR UPDATE', [
        id,
      ]);
      if (!t) throw new NotFoundException();
      if (
        (
          await m.query('SELECT 1 FROM video_tags WHERE tag_id=$1 LIMIT 1', [
            id,
          ])
        ).length
      )
        throw new ConflictException(
          'Тег используется в видео. Сначала снимите его с видео.',
        );
      await m.query('DELETE FROM tags WHERE id=$1', [id]);
    });
  }
  async videoTags(id: number, user: number, tagIds: number[]) {
    await this.db.transaction(async (m) => {
      const [v] = await m.query(
        'SELECT c.owner_id FROM videos v JOIN channels c ON c.id=v.channel_id WHERE v.id=$1 FOR UPDATE OF v',
        [id],
      );
      if (!v) throw new NotFoundException();
      if (v.owner_id !== user) throw new ForbiddenException();
      await m.query('DELETE FROM video_tags WHERE video_id=$1', [id]);
      for (const tag of tagIds)
        await m.query('INSERT INTO video_tags VALUES($1,$2)', [id, tag]);
    });
    return { id, tagIds };
  }
  playlists(user: number) {
    return this.db.query(
      'SELECT p.id,p.title,p.created_at AS "createdAt",count(pi.video_id)::integer AS "itemCount" FROM playlists p LEFT JOIN playlist_items pi ON pi.playlist_id=p.id WHERE p.owner_id=$1 GROUP BY p.id ORDER BY p.created_at DESC,p.id DESC',
      [user],
    );
  }
  async playlist(id: number, user: number) {
    const [p] = await this.db.query(
      'SELECT id,title,created_at AS "createdAt" FROM playlists WHERE id=$1 AND owner_id=$2',
      [id, user],
    );
    if (!p) throw new NotFoundException();
    p.items = await this.db.query(
      `SELECT pi.video_id AS id,pi.position,(v.status='published' OR c.owner_id=$2) AS available,CASE WHEN v.status='published' OR c.owner_id=$2 THEN v.title ELSE 'Недоступное видео' END AS title,CASE WHEN v.status='published' OR c.owner_id=$2 THEN v.status ELSE NULL END AS status FROM playlist_items pi JOIN videos v ON v.id=pi.video_id JOIN channels c ON c.id=v.channel_id WHERE pi.playlist_id=$1 ORDER BY pi.position`,
      [id, user],
    );
    return p;
  }
  async createPlaylist(user: number, title: string) {
    const [p] = await this.db.query(
      'INSERT INTO playlists(owner_id,title) VALUES($1,$2) RETURNING id,title',
      [user, title],
    );
    return { ...p, items: [] };
  }
  private async ownPlaylist(m: EntityManager, id: number, user: number) {
    const [p] = await m.query(
      'SELECT owner_id FROM playlists WHERE id=$1 FOR UPDATE',
      [id],
    );
    if (!p) throw new NotFoundException();
    if (p.owner_id !== user) throw new ForbiddenException();
  }
  async renamePlaylist(id: number, user: number, title: string) {
    await this.db.transaction(async (m) => {
      await this.ownPlaylist(m, id, user);
      await m.query('UPDATE playlists SET title=$2 WHERE id=$1', [id, title]);
    });
    return { id, title };
  }
  async deletePlaylist(id: number, user: number) {
    await this.db.transaction(async (m) => {
      await this.ownPlaylist(m, id, user);
      await m.query('DELETE FROM playlists WHERE id=$1', [id]);
    });
  }
  // Rebuild only the pure relation inside one transaction, avoiding transient UNIQUE position conflicts.
  private async writeOrder(m: EntityManager, id: number, ids: number[]) {
    await m.query('DELETE FROM playlist_items WHERE playlist_id=$1', [id]);
    await m.query(
      'INSERT INTO playlist_items(playlist_id,video_id,position) SELECT $1,video_id,position::integer FROM unnest($2::integer[]) WITH ORDINALITY AS x(video_id,position)',
      [id, ids],
    );
  }
  async addItem(id: number, user: number, video: number) {
    await this.db.transaction(async (m) => {
      await this.ownPlaylist(m, id, user);
      const [v] = await m.query(
        "SELECT v.id FROM videos v JOIN channels c ON c.id=v.channel_id WHERE v.id=$1 AND (v.status='published' OR c.owner_id=$2)",
        [video, user],
      );
      if (!v) throw new NotFoundException('Видео недоступно');
      const ids = (
        await m.query(
          'SELECT video_id FROM playlist_items WHERE playlist_id=$1 ORDER BY position',
          [id],
        )
      ).map((r: { video_id: number }) => r.video_id);
      if (ids.includes(video)) return;
      if (ids.length >= 1000)
        throw new ConflictException('Плейлист содержит максимум 1000 видео');
      ids.push(video);
      await this.writeOrder(m, id, ids);
    });
    return this.playlist(id, user);
  }
  async order(id: number, user: number, videoIds: number[]) {
    await this.db.transaction(async (m) => {
      await this.ownPlaylist(m, id, user);
      const rows = await m.query(
        'SELECT video_id FROM playlist_items WHERE playlist_id=$1',
        [id],
      );
      if (
        rows.length !== videoIds.length ||
        rows.some((r: { video_id: number }) => !videoIds.includes(r.video_id))
      )
        throw new BadRequestException(
          'Порядок должен содержать все текущие видео ровно один раз',
        );
      await this.writeOrder(m, id, videoIds);
    });
    return this.playlist(id, user);
  }
  async removeItem(id: number, user: number, video: number) {
    await this.db.transaction(async (m) => {
      await this.ownPlaylist(m, id, user);
      const ids = (
        await m.query(
          'SELECT video_id FROM playlist_items WHERE playlist_id=$1 AND video_id<>$2 ORDER BY position',
          [id, video],
        )
      ).map((r: { video_id: number }) => r.video_id);
      await this.writeOrder(m, id, ids);
    });
    return this.playlist(id, user);
  }
}
