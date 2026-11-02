import type { MigrationInterface, QueryRunner } from 'typeorm';
export class Comments1800000000001 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      'ALTER TABLE videos ADD COLUMN comments_enabled boolean NOT NULL DEFAULT true',
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE videos DROP COLUMN comments_enabled');
  }
}
