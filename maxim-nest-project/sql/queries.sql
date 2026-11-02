-- 01 Public catalog. $1 limit. Unit: video.
SELECT v.id,v.title,c.title AS channel,u.display_name AS author FROM videos v JOIN channels c ON c.id=v.channel_id JOIN users u ON u.id=c.owner_id WHERE v.status='published' ORDER BY v.published_at DESC,v.id DESC LIMIT $1;
-- 02 Channel videos. $1 channel, $2 status. Unit: video.
SELECT id,title,status,size_bytes,created_at FROM videos WHERE channel_id=$1 AND status=$2 ORDER BY created_at DESC,id DESC;
-- 03 Title search. $1 escaped ILIKE pattern (literal % and _ escaped). Unit: video.
SELECT id,title FROM videos WHERE status='published' AND title ILIKE $1 ORDER BY published_at DESC,id DESC;
-- 04 All channels, including empty. No parameters. Unit: channel.
SELECT c.id,c.title,count(v.id)::integer AS published_count FROM channels c LEFT JOIN videos v ON v.channel_id=c.id AND v.status='published' GROUP BY c.id ORDER BY c.id;
-- 05 Favorite counts, including zero. No parameters. Unit: user.
SELECT u.id,count(f.video_id)::integer AS favorite_count FROM users u LEFT JOIN favorites f ON f.user_id=u.id GROUP BY u.id ORDER BY u.id;
-- 06 Popular public tags. $1 minimum. Unit: tag.
SELECT t.id,t.name,count(*)::integer AS video_count FROM tags t JOIN video_tags vt ON vt.tag_id=t.id JOIN videos v ON v.id=vt.video_id WHERE v.status='published' GROUP BY t.id HAVING count(*) >= $1 ORDER BY video_count DESC,t.id;
-- 07 Public untagged videos. No parameters. Unit: video.
SELECT v.id,v.title FROM videos v WHERE v.status='published' AND NOT EXISTS(SELECT 1 FROM video_tags vt WHERE vt.video_id=v.id) ORDER BY v.id;
-- 08 Owner playlist. $1 playlist, $2 owner. Unit: playlist item.
SELECT pi.position,v.id,v.title,v.status FROM playlists p JOIN playlist_items pi ON pi.playlist_id=p.id JOIN videos v ON v.id=pi.video_id WHERE p.id=$1 AND p.owner_id=$2 ORDER BY pi.position;
-- 09 Visible favorites. $1 user. Unit: favorite.
SELECT v.id,v.title,c.title AS channel FROM favorites f JOIN videos v ON v.id=f.video_id JOIN channels c ON c.id=v.channel_id WHERE f.user_id=$1 AND v.status='published' ORDER BY f.created_at DESC,v.id DESC;
-- 10 Stored and actual quota. No parameters. Unit: channel.
SELECT c.id,c.used_bytes,COALESCE(sum(v.size_bytes),0)::text AS actual_bytes,(c.used_bytes-COALESCE(sum(v.size_bytes),0))::text AS difference FROM channels c LEFT JOIN videos v ON v.channel_id=c.id GROUP BY c.id ORDER BY c.id;
-- 11 Idempotent favorite mutation. $1 user, $2 video. Unit: relation; action add/remove is explicit parameter $3.
WITH added AS (INSERT INTO favorites(user_id,video_id) SELECT $1,$2 WHERE $3::text='add' ON CONFLICT DO NOTHING RETURNING video_id), removed AS (DELETE FROM favorites WHERE user_id=$1 AND video_id=$2 AND $3::text='remove' RETURNING video_id) SELECT 'added' AS action,video_id FROM added UNION ALL SELECT 'removed',video_id FROM removed;
-- 12 Next public page. $1 timestamptz(3), $2 integer video id, $3 limit. Unit: video.
SELECT id,title,published_at FROM videos WHERE status='published' AND (published_at,id)<($1::timestamptz,$2::integer) ORDER BY published_at DESC,id DESC LIMIT $3;
