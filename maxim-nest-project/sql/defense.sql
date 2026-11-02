-- Read-only defence walkthrough. Run from repository root:
-- docker compose exec -T db psql -U vidnest -d vidnest < maxim-nest-project/sql/defense.sql
\set ON_ERROR_STOP on
\pset pager off
BEGIN READ ONLY;
\echo '1. Domain tables (eight) and TypeORM migration history'
SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
SELECT name FROM migrations ORDER BY timestamp;
\echo '2. Constraints on all eight domain tables'
SELECT conrelid::regclass AS table_name,conname,pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace='public'::regnamespace
  AND conrelid::regclass::text IN ('users','channels','videos','tags','video_tags','playlists','playlist_items','favorites')
ORDER BY conrelid::regclass::text,conname;
\echo '3. All channels: used_bytes must equal actual_bytes; difference must be zero'
SELECT c.id,c.title,c.quota_bytes,c.used_bytes,
       COALESCE(SUM(v.size_bytes),0) AS actual_bytes,
       c.used_bytes-COALESCE(SUM(v.size_bytes),0) AS difference
FROM channels c LEFT JOIN videos v ON v.channel_id=c.id
GROUP BY c.id ORDER BY c.id;
\echo '4. Public catalog with author and channel'
SELECT v.id,v.title,c.title AS channel,u.display_name AS author,v.published_at
FROM videos v JOIN channels c ON c.id=v.channel_id JOIN users u ON u.id=c.owner_id
WHERE v.status='published' ORDER BY v.published_at DESC,v.id DESC LIMIT 5;
\echo '5. LEFT JOIN: COUNT(*) versus COUNT(v.id); retain channels with no publications'
SELECT c.id,COUNT(*) AS joined_rows,COUNT(v.id) AS published_count
FROM channels c LEFT JOIN videos v ON v.channel_id=c.id AND v.status='published'
GROUP BY c.id ORDER BY c.id;
\echo '6. Same filter in WHERE: channels with no publications disappear'
SELECT c.id,COUNT(v.id) AS published_count
FROM channels c LEFT JOIN videos v ON v.channel_id=c.id
WHERE v.status='published' GROUP BY c.id ORDER BY c.id;
\echo '7. Favorite counts, including users without favorites'
SELECT u.id,u.display_name,COUNT(f.video_id) AS favorite_count
FROM users u LEFT JOIN favorites f ON f.user_id=u.id GROUP BY u.id ORDER BY u.id;
\echo '8. Playlist content in position order'
SELECT p.id,p.title,pi.position,v.id AS video_id,v.title AS video_title,v.status
FROM playlists p LEFT JOIN playlist_items pi ON pi.playlist_id=p.id LEFT JOIN videos v ON v.id=pi.video_id
WHERE p.owner_id=1 ORDER BY p.id,pi.position;
\echo '9. Two tags x three favorites: on untouched small seed count(*)=6, distinct=2 and 3'
SELECT v.id,COUNT(*) AS combinations,COUNT(DISTINCT vt.tag_id) AS tags,COUNT(DISTINCT f.user_id) AS favorites
FROM videos v JOIN video_tags vt ON vt.video_id=v.id JOIN favorites f ON f.video_id=v.id
WHERE v.id=1 AND f.user_id IN (1,2,3) GROUP BY v.id;
\echo '10. Product indexes'
SELECT indexname,indexdef FROM pg_indexes
WHERE schemaname='public' AND indexname IN ('ix_catalog','ix_channel','ix_favorites') ORDER BY indexname;
\echo '11. Live plan; on a small table Seq Scan can be the correct choice'
EXPLAIN (ANALYZE,BUFFERS)
SELECT id,title,published_at FROM videos WHERE status='published'
ORDER BY published_at DESC,id DESC LIMIT 20;
COMMIT;
