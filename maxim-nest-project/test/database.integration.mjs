import 'reflect-metadata';
import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../dist/app.module.js';
import { createDataSource } from '../dist/database/data-source.js';
import { seed } from '../dist/database/seed.js';
import { VideoService } from '../dist/video/video.service.js';
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw Error('TEST_DATABASE_URL must point to a dedicated *_test database');
process.env.DATABASE_URL = url;
process.env.NODE_ENV = 'test';
process.env.DEMO_AUTH = 'true';
let app, db, base;
async function start() {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  db = app.get(DataSource);
}
before(async () => {
  const init = await createDataSource(url).initialize();
  await init.runMigrations();
  await init.destroy();
  await start();
});
after(async () => {
  await app?.close();
});
beforeEach(async () => {
  await db.query(
    'TRUNCATE users,channels,videos,tags,video_tags,playlists,playlist_items,favorites RESTART IDENTITY CASCADE',
  );
  await seed(db);
});
afterEach(async (context) => {
  console.log(
    'STATE',
    context.name,
    await db.query(
      'SELECT count(*) videos, (SELECT count(*) FROM video_tags) tags, (SELECT sum(used_bytes)::text FROM channels) used_bytes FROM videos',
    ),
  );
});
const payload = (over = {}) => ({
  channelId: 1,
  title: 'New video',
  sizeBytes: '5000',
  tagIds: [1, 2],
  ...over,
});
async function http(path, method = 'GET', body, user = '1') {
  return fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(user ? { 'X-Demo-User': user } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function state(channel = 1) {
  return {
    channel: (
      await db.query('SELECT used_bytes FROM channels WHERE id=$1', [channel])
    )[0],
    videos: (await db.query('SELECT count(*) FROM videos'))[0],
    tags: (await db.query('SELECT count(*) FROM video_tags'))[0],
  };
}
async function raceChannel() {
  return (
    await db.query(
      "INSERT INTO channels(owner_id,title,quota_bytes) VALUES(1,'Race',104857600) RETURNING id",
    )
  )[0].id;
}
test('01 fresh migrations and exact small seed / empty relations', async () => {
  assert.equal((await db.query('SELECT count(*) FROM videos'))[0].count, '40');
  assert.equal((await db.query('SELECT count(*) FROM users'))[0].count, '6');
  assert.equal(
    (await db.query('SELECT count(*) FROM favorites'))[0].count,
    '30',
  );
  assert.equal(
    (
      await db.query(
        'SELECT count(v.id) FROM channels c LEFT JOIN videos v ON v.channel_id=c.id WHERE c.id=8',
      )
    )[0].count,
    '0',
  );
});
test('02 persistence after application restart', async () => {
  const r = await http('/videos', 'POST', payload());
  assert.equal(r.status, 201);
  const v = await r.json();
  await app.close();
  await start();
  assert.equal((await http('/videos/' + v.id)).status, 200);
});
test('03 create video, tags and exact quota', async () => {
  const old = await state();
  const r = await http('/videos', 'POST', payload());
  assert.equal(r.status, 201);
  const v = await r.json();
  assert.equal(v.status, 'draft');
  assert.equal(v.sizeBytes, '5000');
  const now = await state();
  assert.equal(
    BigInt(now.channel.used_bytes) - BigInt(old.channel.used_bytes),
    5000n,
  );
  assert.equal(
    (
      await db.query('SELECT count(*) FROM video_tags WHERE video_id=$1', [
        v.id,
      ])
    )[0].count,
    '2',
  );
});
test('04 invalid DTO / unknown fields / query and path', async () => {
  const old = await state();
  for (const p of [
    payload({ title: ' ' }),
    payload({ sizeBytes: '0' }),
    payload({ ownerId: 2 }),
    payload({ tagIds: [1, 1] }),
    payload({ sizeBytes: '9223372036854775808' }),
  ])
    assert.equal((await http('/videos', 'POST', p)).status, 400);
  assert.equal((await http('/videos?limit=101')).status, 400);
  assert.equal((await http('/videos/abc')).status, 400);
  for (const path of [
    '/videos/-1',
    '/videos/99999999999999999',
    '/videos?channelId=2147483648',
    '/videos?cursor=bad',
  ])
    assert.equal((await http(path)).status, 400);
  assert.equal((await http('/videos', 'POST', payload(), null)).status, 401);
  assert.deepEqual(await state(), old);
});
test('05 unknown tag rolls back video, tags AND quota after partial work', async () => {
  const old = await state();
  assert.equal(
    (await http('/videos', 'POST', payload({ tagIds: [1, 999999] }))).status,
    400,
  );
  assert.deepEqual(await state(), old);
});
test('06 PostgreSQL constraints reject direct DML', async () => {
  for (const [sql, code] of [
    ['INSERT INTO favorites VALUES(999,1,now())', '23503'],
    ['UPDATE channels SET used_bytes=-1 WHERE id=1', '23514'],
    ["INSERT INTO tags(name) VALUES('tag-1')", '23505'],
    ["UPDATE videos SET status='invalid' WHERE id=1", '23514'],
    ['UPDATE videos SET size_bytes=0 WHERE id=1', '23514'],
    ['UPDATE videos SET published_at=NULL WHERE id=1', '23514'],
    ['INSERT INTO playlist_items VALUES(1,4,1)', '23505'],
    ['DELETE FROM users WHERE id=1', '23503'],
  ])
    await assert.rejects(db.query(sql), (e) => e.code === code);
});
test('07 concurrent favorite additions are idempotent', async () => {
  await db.query('DELETE FROM favorites WHERE user_id=1 AND video_id=1');
  const rs = await Promise.all([
    http('/me/favorites/1', 'PUT'),
    http('/me/favorites/1', 'PUT'),
  ]);
  assert.deepEqual(
    rs.map((r) => r.status),
    [204, 204],
  );
  assert.equal(
    (
      await db.query(
        'SELECT count(*) FROM favorites WHERE user_id=1 AND video_id=1',
      )
    )[0].count,
    '1',
  );
});
test('08 repeated favorite deletion preserves others', async () => {
  for (let i = 0; i < 2; i++)
    assert.equal((await http('/me/favorites/1', 'DELETE')).status, 204);
  assert.equal(
    (
      await db.query(
        'SELECT count(*) FROM favorites WHERE user_id=2 AND video_id=1',
      )
    )[0].count,
    '1',
  );
});
test('09 insufficient quota leaves state unchanged', async () => {
  const id = await raceChannel();
  const old = await state(id);
  assert.equal(
    (
      await http(
        '/videos',
        'POST',
        payload({ channelId: id, sizeBytes: '104857601' }),
      )
    ).status,
    409,
  );
  assert.deepEqual(await state(id), old);
});
test('10 failure after UPDATE and INSERT completely rolls back', async () => {
  const old = await state();
  await assert.rejects(
    app.get(VideoService).create(payload({ tagIds: [1, 99999] }), 1),
  );
  assert.deepEqual(await state(), old);
});
test('11 two HTTP requests compete for last quota', async () => {
  const id = await raceChannel();
  const rs = await Promise.all([
    http('/videos', 'POST', payload({ channelId: id, sizeBytes: '83886080' })),
    http('/videos', 'POST', payload({ channelId: id, sizeBytes: '83886080' })),
  ]);
  assert.deepEqual(rs.map((r) => r.status).sort(), [201, 409]);
  const s = await state(id);
  assert.equal(s.channel.used_bytes, '83886080');
  assert.equal(
    (await db.query('SELECT count(*) FROM videos WHERE channel_id=$1', [id]))[0]
      .count,
    '1',
  );
  console.log(
    'RACE HTTP',
    rs.map((r) => r.status),
    s.channel,
  );
});
test('12 foreign mutation forbidden, private reading hidden', async () => {
  assert.equal(
    (await http('/videos/5', 'PATCH', { title: 'Wrong owner' }, '2')).status,
    403,
  );
  assert.equal((await http('/videos/5', 'GET', null, '2')).status, 404);
  assert.equal((await http('/videos/5', 'GET', null, null)).status, 404);
  assert.equal(
    (await db.query('SELECT title FROM videos WHERE id=5'))[0].title,
    'Video 5',
  );
});
test('13 hiding removes public catalog and favorites, first publication retained', async () => {
  const at = (await db.query('SELECT published_at FROM videos WHERE id=1'))[0]
    .published_at;
  assert.equal(
    (await http('/videos/1/status', 'PATCH', { status: 'hidden' })).status,
    200,
  );
  assert.ok(
    !(await (await http('/videos?limit=100')).json()).items.some(
      (v) => v.id === 1,
    ),
  );
  assert.ok(
    !(await (await http('/me/favorites')).json()).some((v) => v.id === 1),
  );
  assert.equal(
    (await http('/videos/1/status', 'PATCH', { status: 'published' })).status,
    200,
  );
  assert.equal(
    (
      await db.query('SELECT published_at FROM videos WHERE id=1')
    )[0].published_at.toISOString(),
    at.toISOString(),
  );
});
test('14 identical timestamps: full cursor traversal has no gaps or repeats', async () => {
  let cursor,
    ids = [];
  do {
    const page = await (
      await http('/videos?limit=5' + (cursor ? '&cursor=' + cursor : ''))
    ).json();
    ids.push(...page.items.map((v) => v.id));
    cursor = page.items.length ? page.nextCursor : null;
  } while (cursor);
  const expected = (
    await db.query(
      "SELECT id FROM videos WHERE status='published' ORDER BY published_at DESC,id DESC",
    )
  ).map((v) => v.id);
  assert.deepEqual(ids, expected);
  assert.equal(new Set(ids).size, ids.length);
});
test('15 quota reconciliation includes empty channel', async () => {
  const rows = await db.query(
    'SELECT c.id,c.used_bytes,COALESCE(sum(v.size_bytes),0)::text actual FROM channels c LEFT JOIN videos v ON v.channel_id=c.id GROUP BY c.id ORDER BY c.id',
  );
  assert.equal(rows.length, 8);
  for (const r of rows) assert.equal(r.used_bytes, r.actual);
  assert.equal(rows[7].actual, '0');
});
test('16 exact bigint above MAX_SAFE_INTEGER and fixed SQL count', async () => {
  const r = await http(
    '/videos',
    'POST',
    payload({ sizeBytes: '9007199254740993' }),
  );
  assert.equal(r.status, 201);
  assert.equal((await r.json()).sizeBytes, '9007199254740993');
  const service = app.get(VideoService);
  const original = db.query.bind(db);
  let count = 0;
  db.query = async (...args) => {
    count++;
    return original(...args);
  };
  try {
    for (const limit of [5, 20]) {
      count = 0;
      await service.findAll({ limit });
      assert.equal(count, 2);
      console.log('N+1', limit, 'videos:', count, 'SQL');
    }
  } finally {
    db.query = original;
  }
});
test('17 controlled lock: commit rejects waiter; rollback permits waiter', async () => {
  for (const commit of [true, false]) {
    const id = await raceChannel();
    const a = db.createQueryRunner(),
      b = db.createQueryRunner();
    await a.connect();
    await b.connect();
    try {
      await a.startTransaction();
      await b.startTransaction();
      await a.query("SET LOCAL lock_timeout='3s'");
      await b.query("SET LOCAL lock_timeout='3s'");
      const reserve =
        'UPDATE channels SET used_bytes=used_bytes+83886080 WHERE id=$1 AND quota_bytes-used_bytes>=83886080 RETURNING id';
      await a.query(reserve, [id]);
      await a.query(
        "INSERT INTO videos(channel_id,title,size_bytes,storage_key) VALUES($1,'Controlled first',83886080,$2)",
        [id, 'controlled-first-' + id],
      );
      let finished = false;
      const waiting = b.query(reserve, [id]).then((result) => {
        finished = true;
        return result;
      });
      // Observe waiting via a third pool connection, rather than relying on timing to prove locking.
      let blocked = false;
      for (let i = 0; i < 40; i++) {
        const rows = await db.query(
          "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'UPDATE channels SET used_bytes=used_bytes+83886080%'",
        );
        if (Number(rows[0].count) > 0) {
          blocked = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 25));
      }
      assert.ok(blocked);
      assert.equal(finished, false);
      if (commit) await a.commitTransaction();
      else await a.rollbackTransaction();
      const result = await waiting;
      assert.equal(result[1], commit ? 0 : 1);
      if (result[1] === 1) {
        await b.query(
          "INSERT INTO videos(channel_id,title,size_bytes,storage_key) VALUES($1,'Controlled second',83886080,$2)",
          [id, 'controlled-second-' + id],
        );
        await b.commitTransaction();
      } else await b.rollbackTransaction();
      const [ledger] = await db.query(
        'SELECT c.used_bytes,COALESCE(sum(v.size_bytes),0)::text actual FROM channels c LEFT JOIN videos v ON v.channel_id=c.id WHERE c.id=$1 GROUP BY c.id',
        [id],
      );
      assert.equal(ledger.used_bytes, ledger.actual);
      console.log(
        'CONTROLLED LOCK',
        commit ? 'commit' : 'rollback',
        'waiter affected',
        result[1],
      );
    } finally {
      if (a.isTransactionActive) await a.rollbackTransaction();
      if (b.isTransactionActive) await b.rollbackTransaction();
      await a.release();
      await b.release();
    }
  }
});

// Optional legacy demo links do not change fixture counts, quota or creation rules.
test('18 legacy published demos expose playback URLs; new metadata stays optional', async () => {
  for (const id of [1, 2]) {
    const response = await http('/videos/' + id);
    assert.equal(response.status, 200);
    assert.equal(
      (await response.json()).playbackUrl,
      'https://samplelib.com/mp4/sample-5s.mp4',
    );
  }
  const response = await http('/videos', 'POST', payload());
  assert.equal(response.status, 201);
  assert.equal((await response.json()).playbackUrl, null);
});

test('19 new demo users and own profile lifecycle', async () => {
  const created = await http('/users', 'POST', {
    displayName: 'Creator',
    email: ' NEW@EXAMPLE.TEST ',
  });
  assert.equal(created.status, 201);
  const user = await created.json();
  assert.ok(user.id > 6);
  assert.equal(user.email, 'new@example.test');
  assert.equal(
    (
      await http(
        '/me',
        'PATCH',
        { displayName: 'Renamed', email: 'renamed@example.test' },
        String(user.id),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await http('/users', 'POST', {
        displayName: 'Duplicate',
        email: 'renamed@example.test',
      })
    ).status,
    409,
  );
  assert.equal((await http('/users', 'GET', null, '999999')).status, 400);
  assert.equal(
    (await http('/me', 'DELETE', null, String(user.id))).status,
    204,
  );
  assert.equal(
    (await http('/users', 'GET', null, String(user.id))).status,
    400,
  );
  assert.equal((await http('/me', 'DELETE')).status, 409);
});
test('20 channel lifecycle preserves ownership and immutable quota', async () => {
  const res = await http('/channels', 'POST', {
    title: 'My channel',
    quotaBytes: '9007199254740993',
  });
  assert.equal(res.status, 201);
  const { id } = await res.json();
  const channels = await (await http('/channels')).json();
  assert.equal(
    channels.find((c) => c.id === id).quotaBytes,
    '9007199254740993',
  );
  assert.equal(
    (await http('/channels/' + id, 'PATCH', { title: 'Foreign' }, '2')).status,
    403,
  );
  assert.equal(
    (await http('/channels/' + id, 'PATCH', { title: 'Renamed' })).status,
    200,
  );
  assert.equal(
    (await http('/channels/' + id, 'PATCH', { quotaBytes: '2' })).status,
    400,
  );
  assert.equal(
    (await http('/channels/' + id, 'DELETE', null, '2')).status,
    403,
  );
  assert.equal((await http('/channels/' + id, 'DELETE')).status, 204);
  assert.equal((await http('/channels/1', 'DELETE')).status, 409);
  assert.equal(
    (
      await http('/channels', 'POST', {
        title: 'Too big',
        quotaBytes: '9223372036854775808',
      })
    ).status,
    400,
  );
});
test('21 shared tags normalize, conflict, rename and protect used relations', async () => {
  const r = await http('/tags', 'POST', { name: ' TypeScript ' });
  assert.equal(r.status, 201);
  const t = await r.json();
  assert.equal(t.name, 'typescript');
  assert.equal(
    (await http('/tags', 'POST', { name: 'TYPESCRIPT' })).status,
    409,
  );
  assert.equal(
    (await http('/tags/' + t.id, 'PATCH', { name: 'renamed-tag' })).status,
    200,
  );
  assert.equal((await http('/tags/' + t.id, 'DELETE')).status, 204);
  assert.equal((await http('/tags/1', 'DELETE')).status, 409);
  assert.equal(
    (await db.query('SELECT count(*) FROM video_tags WHERE tag_id=1'))[0].count,
    '7',
  );
});
test('22 owned video pages include private statuses and use stable cursor', async () => {
  let cursor,
    ids = [];
  do {
    const r = await http(
      '/me/videos?limit=3' + (cursor ? '&cursor=' + cursor : ''),
    );
    assert.equal(r.status, 200);
    const p = await r.json();
    ids.push(...p.items.map((v) => v.id));
    cursor = p.items.length ? p.nextCursor : null;
  } while (cursor);
  assert.deepEqual(ids, [36, 35, 29, 28, 22, 21, 15, 14, 8, 7, 1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal((await http('/me/videos', 'GET', null, null)).status, 401);
});
test('23 metadata, comments, playback and tag edits commit or roll back together', async () => {
  const [before] = await db.query(
    'SELECT title,comments_enabled,playback_url FROM videos WHERE id=1',
  );
  assert.equal(
    (
      await http('/videos/1', 'PATCH', {
        title: 'Changed',
        commentsEnabled: false,
        playbackUrl: null,
        tagIds: [3, 99999],
      })
    ).status,
    400,
  );
  assert.deepEqual(
    (
      await db.query(
        'SELECT title,comments_enabled,playback_url FROM videos WHERE id=1',
      )
    )[0],
    before,
  );
  assert.deepEqual(
    (
      await db.query(
        'SELECT tag_id FROM video_tags WHERE video_id=1 ORDER BY tag_id',
      )
    ).map((v) => v.tag_id),
    [1, 2],
  );
  const r = await http('/videos/1', 'PATCH', {
    title: 'Changed',
    commentsEnabled: false,
    playbackUrl: 'https://example.test/demo.mp4',
    tagIds: [3, 4],
  });
  assert.equal(r.status, 200);
  const v = await r.json();
  assert.equal(v.commentsEnabled, false);
  assert.equal(v.playbackUrl, 'https://example.test/demo.mp4');
  assert.deepEqual(
    v.tags.map((t) => t.id),
    [3, 4],
  );
  assert.equal(
    (await http('/videos/1', 'PATCH', { playbackUrl: 'javascript:alert(1)' }))
      .status,
    400,
  );
  assert.equal(
    (await http('/videos/1/tags', 'PUT', { tagIds: [] }, '2')).status,
    403,
  );
  assert.equal(
    (await http('/videos/1/tags', 'PUT', { tagIds: [] })).status,
    200,
  );
  assert.equal(
    (await http('/videos/1', 'PATCH', { playbackUrl: null })).status,
    200,
  );
  assert.equal((await (await http('/videos/1')).json()).playbackUrl, null);
});
test('24 playlists create, edit, order, remove, delete and enforce owner', async () => {
  const r = await http('/me/playlists', 'POST', { title: 'Study' });
  assert.equal(r.status, 201);
  const { id } = await r.json();
  assert.equal(
    (await http('/me/playlists/' + id, 'PATCH', { title: 'Renamed' })).status,
    200,
  );
  for (const videoId of [1, 2, 3])
    assert.equal(
      (await http(`/me/playlists/${id}/items`, 'POST', { videoId })).status,
      201,
    );
  assert.equal(
    (await http(`/me/playlists/${id}/items`, 'POST', { videoId: 1 })).status,
    201,
  );
  assert.equal(
    (await http(`/me/playlists/${id}/items`, 'POST', { videoId: 7 })).status,
    201,
  ); // own hidden video allowed
  assert.equal(
    (await http(`/me/playlists/${id}/items`, 'POST', { videoId: 10 })).status,
    404,
  ); // foreign draft
  assert.equal(
    (await http(`/me/playlists/${id}`, 'GET', null, '2')).status,
    404,
  );
  assert.equal(
    (
      await http(
        `/me/playlists/${id}/order`,
        'PUT',
        { videoIds: [7, 3, 2, 1] },
        '2',
      )
    ).status,
    403,
  );
  assert.equal(
    (await http(`/me/playlists/${id}/order`, 'PUT', { videoIds: [1, 2] }))
      .status,
    400,
  );
  const order = await http(`/me/playlists/${id}/order`, 'PUT', {
    videoIds: [7, 3, 2, 1],
  });
  assert.equal(order.status, 200);
  assert.deepEqual(
    (await order.json()).items.map((v) => v.id),
    [7, 3, 2, 1],
  );
  const removed = await http(`/me/playlists/${id}/items/3`, 'DELETE');
  assert.equal(removed.status, 200);
  assert.deepEqual(
    (await removed.json()).items.map((v) => [v.id, v.position]),
    [
      [7, 1],
      [2, 2],
      [1, 3],
    ],
  );
  assert.equal(
    (await http(`/me/playlists/${id}`, 'DELETE', null, '2')).status,
    403,
  );
  assert.equal((await http(`/me/playlists/${id}`, 'DELETE')).status, 204);
  assert.equal(
    (
      await db.query(
        'SELECT count(*) FROM playlist_items WHERE playlist_id=$1',
        [id],
      )
    )[0].count,
    '0',
  );
});
test('25 concurrent playlist appends serialize and hidden foreign items reveal no metadata', async () => {
  const r = await http('/me/playlists', 'POST', { title: 'Concurrent' });
  const { id } = await r.json();
  const result = await Promise.all([
    http(`/me/playlists/${id}/items`, 'POST', { videoId: 1 }),
    http(`/me/playlists/${id}/items`, 'POST', { videoId: 2 }),
  ]);
  assert.deepEqual(
    result.map((r) => r.status),
    [201, 201],
  );
  const items = (await (await http(`/me/playlists/${id}`)).json()).items;
  assert.equal(items.length, 2);
  assert.deepEqual(
    items.map((v) => v.position),
    [1, 2],
  );
  await http('/videos/2/status', 'PATCH', { status: 'hidden' }, '2');
  const hidden = (await (await http(`/me/playlists/${id}`)).json()).items.find(
    (v) => v.id === 2,
  );
  assert.equal(hidden.available, false);
  assert.equal(hidden.title, 'Недоступное видео');
  assert.equal(hidden.status, null);
});
