import type { MigrationInterface, QueryRunner } from 'typeorm';
export class Indexes1800000000002 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
 CREATE INDEX ix_catalog ON videos(published_at DESC,id DESC) WHERE status='published';
 CREATE INDEX ix_channel ON videos(channel_id,created_at DESC,id DESC);
 CREATE INDEX ix_favorites ON favorites(user_id,created_at DESC,video_id DESC);`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP INDEX ix_catalog, ix_channel, ix_favorites');
  }
}
