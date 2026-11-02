import type { DataSource } from 'typeorm';
/** Deterministic, fictitious fixtures. Deliberately requires an empty database. */
export async function seed(db: DataSource, large = false) {
  await db.transaction(async (m) => {
    if (Number((await m.query('SELECT count(*) FROM users'))[0].count))
      throw new Error('Seed requires an empty database');
    await m.query(`INSERT INTO users(display_name,email) SELECT 'User '||i,'user'||i||'@example.test' FROM generate_series(1,6) i;
 INSERT INTO channels(owner_id,title,quota_bytes) SELECT 1+(i-1)%6,'Channel '||i,1000000000000000000 FROM generate_series(1,8) i;
 INSERT INTO tags(name) SELECT 'tag-'||i FROM generate_series(1,12) i;
 INSERT INTO videos(channel_id,title,status,size_bytes,storage_key,created_at,published_at)
 SELECT 1+(i-1)%7,'Video '||i, CASE WHEN i%5=0 THEN 'draft' WHEN i%7=0 THEN 'hidden' ELSE 'published' END,
 i*1000,'small/'||i,'2026-09-01T12:00:00Z'::timestamptz,
 CASE WHEN i%5=0 THEN NULL ELSE '2026-09-01T12:00:00Z'::timestamptz END FROM generate_series(1,40) i;
 INSERT INTO video_tags SELECT i,1+(i-1)%12 FROM generate_series(1,39) i;
 INSERT INTO video_tags SELECT i,1+i%12 FROM generate_series(1,39) i;
 INSERT INTO playlists(owner_id,title) SELECT i,'Playlist '||i FROM generate_series(1,6) i;
 INSERT INTO playlist_items SELECT p,v,v FROM generate_series(1,5) p CROSS JOIN generate_series(1,3) v;
 INSERT INTO favorites(user_id,video_id) SELECT u,v FROM generate_series(1,5) u CROSS JOIN generate_series(1,6) v;`);
    if (large)
      await m.query(`
 INSERT INTO channels(owner_id,title,quota_bytes) SELECT 1+(i%6),'Extended '||i,1000000000000000000 FROM generate_series(1,300) i;
 INSERT INTO videos(channel_id,title,status,size_bytes,storage_key,published_at)
 SELECT CASE WHEN i%2=0 THEN 9 ELSE 10+i%299 END,'Extended video '||i,
 CASE WHEN i%5=0 THEN 'draft' ELSE 'published' END,1000,'large/'||i,
 CASE WHEN i%5=0 THEN NULL ELSE '2026-10-01T00:00:00Z'::timestamptz + (i||' milliseconds')::interval END
 FROM generate_series(1,10000) i;
 INSERT INTO video_tags SELECT v.id,t FROM videos v CROSS JOIN generate_series(1,3) t WHERE v.storage_key LIKE 'large/%';`);
    await m.query(
      `UPDATE channels c SET used_bytes=(SELECT COALESCE(sum(size_bytes),0) FROM videos v WHERE v.channel_id=c.id)`,
    );
    // Preserve the two published playable fixtures from the lab2-docker seed.
    await m.query(`UPDATE videos SET playback_url='https://samplelib.com/mp4/sample-5s.mp4',
      description='Description ' || id WHERE storage_key IN ('small/1','small/2')`);
    console.log(
      'Seed:',
      large ? 'large' : 'small',
      await m.query('SELECT count(*) FROM videos'),
    );
  });
}
