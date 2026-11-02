import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
@Injectable()
export class FavoritesService {
  constructor(private readonly db: DataSource) {}
  async add(video: number, user: number) {
    // Single statement checks publication and resolves duplicate pairs atomically.
    const result = await this.db.query(
      `WITH available AS (SELECT id FROM videos WHERE id=$1 AND status='published'), inserted AS (INSERT INTO favorites(user_id,video_id) SELECT $2,id FROM available ON CONFLICT DO NOTHING RETURNING video_id) SELECT id FROM available`,
      [video, user],
    );
    if (!result.length) throw new NotFoundException();
  }
  async remove(video: number, user: number) {
    await this.db.query(
      'DELETE FROM favorites WHERE user_id=$1 AND video_id=$2',
      [user, video],
    );
  }
  list(user: number) {
    return this.db.query(
      `SELECT v.id,v.title,v.status,v.size_bytes AS "sizeBytes",c.id AS "channelId",c.title AS "channelTitle",u.display_name AS author,v.playback_url AS "playbackUrl" FROM favorites f JOIN videos v ON v.id=f.video_id JOIN channels c ON c.id=v.channel_id JOIN users u ON u.id=c.owner_id WHERE f.user_id=$1 AND v.status='published' ORDER BY f.created_at DESC,f.video_id DESC`,
      [user],
    );
  }
}
