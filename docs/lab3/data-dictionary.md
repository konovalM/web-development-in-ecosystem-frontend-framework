# Словарь данных

Все идентификаторы integer; байты bigint сериализуются строкой. Моменты времени timestamptz(3) сериализуются ISO 8601 UTC. Служебная migrations — таблица TypeORM, не сущность предметной области.

## users

- **id** — Идентификатор пользователя. Тип `integer`; NOT NULL; default `IDENTITY`. Ограничения: PK. Пример: `1`.
- **display_name** — Отображаемое имя. Тип `text`; NOT NULL; default `нет`. Ограничения: trim не пуст. Пример: `User 1`.
- **email** — Нормализованный email. Тип `text`; NOT NULL; default `нет`. Ограничения: UNIQUE; lower(trim); содержит @. Пример: `user1@example.test`.
- **created_at** — Дата создания. Тип `timestamptz(3)`; NOT NULL; default `now()`. Ограничения: момент UTC. Пример: `2026-09-01T12:00:00Z`.
## channels

- **id** — Канал. Тип `integer`; NOT NULL; default `IDENTITY`. Ограничения: PK. Пример: `1`.
- **owner_id** — Владелец. Тип `integer`; NOT NULL; default `нет`. Ограничения: FK users RESTRICT. Пример: `1`.
- **title** — Название. Тип `text`; NOT NULL; default `нет`. Ограничения: trim не пуст. Пример: `Channel 1`.
- **quota_bytes** — Лимит байтов. Тип `bigint`; NOT NULL; default `1073741824`. Ограничения: >=0. Пример: `104857600`.
- **used_bytes** — Зарезервированные байты. Тип `bigint`; NOT NULL; default `0`. Ограничения: 0..quota_bytes. Пример: `83886080`.
## videos

- **id** — Видео. Тип `integer`; NOT NULL; default `IDENTITY`. Ограничения: PK. Пример: `1`.
- **channel_id** — Канал видео. Тип `integer`; NOT NULL; default `нет`. Ограничения: FK channels RESTRICT. Пример: `1`.
- **title** — Название. Тип `text`; NOT NULL; default `нет`. Ограничения: trim длиной 3..100. Пример: `Video 1`.
- **description** — Необязательное описание. Тип `text`; NULL; default `NULL`. Ограничения: длина <=1000. Пример: `Учебное видео`.
- **status** — Состояние публикации. Тип `text`; NOT NULL; default `draft`. Ограничения: draft/published/hidden. Пример: `published`.
- **size_bytes** — Неизменяемый в API размер. Тип `bigint`; NOT NULL; default `нет`. Ограничения: >0. Пример: `9007199254740993`.
- **storage_key** — Условный ключ хранения; UUID при POST. Тип `text`; NOT NULL; default `нет`. Ограничения: UNIQUE. Пример: `small/1`.
- **created_at** — Дата создания. Тип `timestamptz(3)`; NOT NULL; default `now()`. Ограничения: момент UTC. Пример: `2026-09-01T12:00:00Z`.
- **published_at** — Первая публикация. Тип `timestamptz(3)`; NULL; default `NULL`. Ограничения: NOT NULL при published. Пример: `2026-09-01T12:00:00Z`.
- **comments_enabled** — Готовность схемы к настройке комментариев. Тип `boolean`; NOT NULL; default `true`. Ограничения: миграция 2. Пример: `true`.
- **playback_url** — необязательная внешняя ссылка воспроизведения. Тип `text`; NULL; default NULL. CHECK: http/https, без пробелов. Пример: `https://samplelib.com/mp4/sample-5s.mp4`. В JSON `playbackUrl`.

## tags

- **id** — Тег. Тип `integer`; NOT NULL; default `IDENTITY`. Ограничения: PK. Пример: `1`.
- **name** — Нормализованное имя. Тип `text`; NOT NULL; default `нет`. Ограничения: UNIQUE; lower(trim); не пуст. Пример: `tag-1`.
## video_tags

- **video_id** — Видео связи. Тип `integer`; NOT NULL; default `нет`. Ограничения: PK совместно с tag_id; FK videos CASCADE. Пример: `1`.
- **tag_id** — Тег связи. Тип `integer`; NOT NULL; default `нет`. Ограничения: PK совместно с video_id; FK tags CASCADE. Пример: `2`.
## playlists

- **id** — Плейлист. Тип `integer`; NOT NULL; default `IDENTITY`. Ограничения: PK. Пример: `1`.
- **owner_id** — Владелец списка. Тип `integer`; NOT NULL; default `нет`. Ограничения: FK users RESTRICT. Пример: `1`.
- **title** — Название. Тип `text`; NOT NULL; default `нет`. Ограничения: trim не пуст. Пример: `Playlist 1`.
- **created_at** — Дата создания. Тип `timestamptz(3)`; NOT NULL; default `now()`. Ограничения: момент UTC. Пример: `2026-09-01T12:00:00Z`.
## playlist_items

- **playlist_id** — Плейлист связи. Тип `integer`; NOT NULL; default `нет`. Ограничения: составной PK; FK playlists CASCADE. Пример: `1`.
- **video_id** — Видео связи. Тип `integer`; NOT NULL; default `нет`. Ограничения: составной PK; FK videos CASCADE. Пример: `2`.
- **position** — Позиция внутри плейлиста. Тип `integer`; NOT NULL; default `нет`. Ограничения: >0; UNIQUE(playlist_id,position). Пример: `2`.
## favorites

- **user_id** — Пользователь. Тип `integer`; NOT NULL; default `нет`. Ограничения: составной PK; FK users CASCADE. Пример: `1`.
- **video_id** — Видео. Тип `integer`; NOT NULL; default `нет`. Ограничения: составной PK; FK videos CASCADE. Пример: `2`.
- **created_at** — Дата добавления. Тип `timestamptz(3)`; NOT NULL; default `now()`. Ограничения: момент UTC. Пример: `2026-09-01T12:00:00Z`.
