import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createDataSource } from '../dist/database/data-source.js';
import { Initial1800000000000 } from '../dist/database/migrations/initial.js';
import { Comments1800000000001 } from '../dist/database/migrations/comments.js';
import { Indexes1800000000002 } from '../dist/database/migrations/indexes.js';
import { Playback1800000000003 } from '../dist/database/migrations/playback.js';
import { seed } from '../dist/database/seed.js';
const output = new URL('../../docs/lab3/evidence/', import.meta.url);
await mkdir(output, { recursive: true });
const root = process.env.DATABASE_URL;
if (!root) throw Error('DATABASE_URL required');
async function connect(name) {
  const url = new URL(root);
  url.pathname = '/' + name;
  return createDataSource(url.href).initialize();
}
// The script only mutates its two explicitly named disposable databases.
const migration = await connect('vidnest_migration_test');
try {
  await migration.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  const q = migration.createQueryRunner();
  await q.connect();
  try {
    await new Initial1800000000000().up(q);
    await new Playback1800000000003().up(q);
    await seed(migration);
    const count = (await q.query('SELECT count(*) FROM videos'))[0].count;
    await new Comments1800000000001().up(q);
    assert.equal(
      (
        await q.query('SELECT count(*) FROM videos WHERE comments_enabled=true')
      )[0].count,
      count,
    );
    await q.query('UPDATE videos SET comments_enabled=false WHERE id=1');
    await new Comments1800000000001().down(q);
    await new Comments1800000000001().up(q);
    assert.equal(
      (await q.query('SELECT comments_enabled FROM videos WHERE id=1'))[0]
        .comments_enabled,
      true,
    );
    await writeFile(
      new URL('migration.json', output),
      JSON.stringify(
        {
          before: count,
          after: (await q.query('SELECT count(*) FROM videos'))[0].count,
          rollbackReapply: true,
          lost: 'comments_enabled=false returns to default true',
        },
        null,
        2,
      ),
    );
    // Run all 12 SQL queries against the same exact small fixture.
    const text = await readFile(
      new URL('../sql/queries.sql', import.meta.url),
      'utf8',
    );
    const blocks = text.split(/(?=-- \d{2} )/).filter((x) => x.trim());
    const params = [
      [5],
      [1, 'published'],
      ['%Video 1%'],
      [],
      [],
      [5],
      [],
      [1, 1],
      [1],
      [],
      [6, 1, 'add'],
      ['2026-09-01T12:00:00.000Z', 39, 5],
    ];
    const results = [];
    for (let i = 0; i < blocks.length; i++)
      results.push({
        number: i + 1,
        parameters: params[i],
        rows: await q.query(blocks[i], params[i]),
      });
    assert.deepEqual(
      results[0].rows.map((v) => v.id),
      [39, 38, 37, 36, 34],
    );
    assert.deepEqual(
      results[1].rows.map((v) => v.id),
      [36, 29, 22, 8, 1],
    );
    assert.equal(results[3].rows[7].published_count, 0);
    assert.deepEqual(
      results[4].rows.map((v) => v.favorite_count),
      [6, 6, 6, 6, 6, 0],
    );
    assert.deepEqual(results[6].rows, []);
    assert.deepEqual(
      results[7].rows.map((v) => v.id),
      [1, 2, 3],
    );
    assert.deepEqual(
      results[8].rows.map((v) => v.id),
      [6, 4, 3, 2, 1],
    );
    assert.ok(results[9].rows.every((v) => v.difference === '0'));
    assert.deepEqual(
      results[11].rows.map((v) => v.id),
      [38, 37, 36, 34, 33],
    );
    // Restore query 11 fixture: add twice, delete twice; each result is checked.
    const mutation = blocks[10];
    await q.query(mutation, [6, 1, 'add']);
    await q.query(mutation, [6, 1, 'remove']);
    assert.deepEqual(await q.query(mutation, [6, 1, 'remove']), []);
    await writeFile(
      new URL('queries-small.json', output),
      JSON.stringify(results, null, 2),
    );
  } finally {
    await q.release();
  }
} finally {
  await migration.destroy();
}
const db = await connect('vidnest_measure');
try {
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  await db.runMigrations();
  await seed(db, true);
  const qr = db.createQueryRunner();
  await qr.connect();
  try {
    await new Indexes1800000000002().down(qr);
    const statements = {
      catalog:
        "SELECT id,title,published_at FROM videos WHERE status='published' ORDER BY published_at DESC,id DESC LIMIT 20",
      channel:
        'SELECT id,title,created_at FROM videos WHERE channel_id=9 ORDER BY created_at DESC,id DESC LIMIT 20',
    };
    const results = {
      version: await db.query('SELECT version()'),
      node: process.version,
      counts: await db.query(
        'SELECT (SELECT count(*) FROM videos) videos,(SELECT count(*) FROM video_tags) video_tags,(SELECT count(*) FROM channels) channels',
      ),
      before: {},
      after: {},
    };
    for (const phase of ['before', 'after']) {
      if (phase === 'after') await new Indexes1800000000002().up(qr);
      await db.query('ANALYZE');
      for (const [name, sql] of Object.entries(statements)) {
        const runs = [];
        for (let i = 0; i < 3; i++)
          runs.push(
            (
              await db.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + sql)
            )[0]['QUERY PLAN'][0],
          );
        results[phase][name] = { sql, runs };
      }
    }
    results.indexSizes = await db.query(
      "SELECT indexrelname,pg_relation_size(indexrelid) bytes FROM pg_stat_user_indexes WHERE indexrelname IN ('ix_catalog','ix_channel','ix_favorites') ORDER BY indexrelname",
    );
    await writeFile(
      new URL('plans.json', output),
      JSON.stringify(results, null, 2),
    );
    console.log('Saved actual plans, small SQL results and migration evidence');
  } finally {
    await qr.release();
  }
} finally {
  await db.destroy();
}
