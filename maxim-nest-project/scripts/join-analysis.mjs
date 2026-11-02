import { writeFile } from 'node:fs/promises';
import { createDataSource } from '../dist/database/data-source.js';
const url = new URL(process.env.DATABASE_URL);
url.pathname = '/vidnest_migration_test';
const db = await createDataSource(url.href).initialize();
try {
  const statements = {
    on: "SELECT c.id,count(*) rows,count(v.id) videos FROM channels c LEFT JOIN videos v ON v.channel_id=c.id AND v.status='published' GROUP BY c.id ORDER BY c.id",
    where:
      "SELECT c.id,count(v.id) videos FROM channels c LEFT JOIN videos v ON v.channel_id=c.id WHERE v.status='published' GROUP BY c.id ORDER BY c.id",
    multiplication:
      'SELECT v.id,vt.tag_id,f.user_id FROM videos v JOIN video_tags vt ON vt.video_id=v.id JOIN favorites f ON f.video_id=v.id WHERE v.id=1 AND f.user_id IN(1,2,3) ORDER BY vt.tag_id,f.user_id',
    distinct:
      'SELECT count(*) combinations,count(DISTINCT vt.tag_id) tags,count(DISTINCT f.user_id) favorites FROM videos v JOIN video_tags vt ON vt.video_id=v.id JOIN favorites f ON f.video_id=v.id WHERE v.id=1 AND f.user_id IN(1,2,3)',
    preaggregate:
      'WITH t AS (SELECT video_id,count(*) tags FROM video_tags GROUP BY video_id),f AS(SELECT video_id,count(*) favorites FROM favorites WHERE user_id IN(1,2,3) GROUP BY video_id) SELECT v.id,t.tags,f.favorites FROM videos v LEFT JOIN t ON t.video_id=v.id LEFT JOIN f ON f.video_id=v.id WHERE v.id=1',
  };
  const output = {};
  for (const [name, sql] of Object.entries(statements))
    output[name] = { sql, rows: await db.query(sql) };
  await writeFile(
    new URL('../../docs/lab3/evidence/join-analysis.json', import.meta.url),
    JSON.stringify(output, null, 2),
  );
} finally {
  await db.destroy();
}
