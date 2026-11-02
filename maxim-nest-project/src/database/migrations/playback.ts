import type { MigrationInterface, QueryRunner } from 'typeorm';

/** External demo media remains optional; this does not upload or store files. */
export class Playback1800000000003 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE videos ADD COLUMN playback_url text
      CONSTRAINT ck_playback_url CHECK (playback_url ~ '^https?://[^[:space:]]+$');
      UPDATE videos SET playback_url='https://samplelib.com/mp4/sample-5s.mp4'
      WHERE storage_key IN ('small/1','small/2');`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE videos DROP COLUMN playback_url');
  }
}
