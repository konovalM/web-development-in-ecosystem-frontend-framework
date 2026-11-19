# VidNest — ЛР3: PostgreSQL, транзакции и каталог

Ветка `lab-3` создана от `lab2-docker` (`4e04fef`). NestJS backend: `maxim-nest-project`, React-клиент: `my-app`.

- [Отчёт по всем этапам](docs/lab3/report.md)
- [Все разделы интерфейса и дополнительные API](docs/lab3/interface.md)
- [ER-диаграмма](docs/lab3/schema.svg), [Mermaid-исходник](docs/lab3/schema.mmd)
- [Словарь данных](docs/lab3/data-dictionary.md)
- [12 SQL-запросов](maxim-nest-project/sql/queries.sql)
- [Фактические результаты](docs/lab3/evidence/), [разбор планов](docs/lab3/plan-analysis.md)

## Требования и версии

Docker Compose v2; Node.js 22+ и npm для локального запуска. Проверено локально: Node 26.2.0, PostgreSQL 17.11, NestJS 12.0.1, TypeORM 1.1.2, pg 8.23.1, TypeScript 6.0.3. Docker использует Node 22 Alpine и PostgreSQL 17 Alpine. Точные зависимости закреплены lock-файлами; `npm ci` устанавливает их без пересчёта.

## Быстрый запуск через Docker

Из корня проекта:

```bash
docker compose up -d --build
# Только на пустой учебной базе; повторный seed явно отклоняется.
docker compose exec backend node dist/database/cli.js seed
```

API: http://localhost:3000/videos ; клиент: http://localhost:5173 . PostgreSQL доступен только на `127.0.0.1:5433`, API и клиент тоже привязаны к loopback. Compose хранит базу в отдельном named volume `postgres-data`; перезапуск контейнера её не удаляет. Миграции выполняются перед стартом backend. Старый JSON volume ЛР2 не используется и не удаляется.

React содержит разделы «Каталог», «Мои видео», «Избранное», «Плейлисты», «Каналы», «Теги» и «Пользователи». Все действия сохраняются через API в PostgreSQL. В формах канал и теги выбираются по названиям. Есть создание/редактирование видео, публикация/скрытие, внешняя ссылка и настройка комментариев, курсорная кнопка «Показать ещё», плейлисты с порядком, каналы с квотой, общий справочник тегов и учебные профили. Подробнее: [интерфейс и API](docs/lab3/interface.md).

Видео 1 и 2 сохраняют внешнюю MP4-ссылку из ЛР2. У других записей playbackUrl может отсутствовать; можно добавить свою ссылку в редакторе. Загрузка и хранение медиафайлов не реализуются.

## Локальный backend

```bash
docker compose up -d db
cd maxim-nest-project
npm ci
cp .env.example .env
npm run build
npm run db:migrate
npm run seed
npm run start:dev
```

`.env.example` содержит только учебные значения. Если собственный `.env` уже существует, внесите DATABASE_URL, DEMO_AUTH и NODE_ENV вручную, сохранив нужные параметры. Реальные секреты не коммитятся. Приложение требует DATABASE_URL, не подменяет БД файлом и не включает synchronize.

В Docker адрес БД `db:5432`, на хосте `127.0.0.1:5433`. Строка: `postgres://vidnest:vidnest_demo@127.0.0.1:5433/vidnest`.

## Миграции и seed

```bash
# Из maxim-nest-project после build:
npm run db:migrate
npm run seed          # 6 users, 8 channels, 40 videos, 12 tags, 6 playlists, 30 favorites
# На ДРУГОЙ пустой базе, выбрав DATABASE_URL:
npm run seed:large    # 10040 videos, 30078 video_tags, 308 channels
```

Seed детерминирован и требует чистую учебную базу. Он не сбрасывает рабочие данные. `db:revert` откатывает последнюю миграцию; использовать только на отдельной одноразовой базе. Откат Comments удаляет настройки comments_enabled; повторное применение ставит true. Автоматическая демонстрация этого сценария включена в `db:measure`.

## Изолированные интеграционные проверки

Создайте отдельные базы один раз (если они уже есть, createdb сообщит об этом):

```bash
docker compose exec -T db createdb -U vidnest vidnest_test
docker compose exec -T db createdb -U vidnest vidnest_measure
docker compose exec -T db createdb -U vidnest vidnest_migration_test
cd maxim-nest-project
TEST_DATABASE_URL=postgres://vidnest:vidnest_demo@127.0.0.1:5433/vidnest_test npm run test:integration
npm test -- --maxWorkers=1 --maxConcurrency=1
npm run lint
```

Запускайте команды последовательно. Основной набор: 25 интеграционных тестов на настоящем PostgreSQL, один процесс, без test.concurrent. Перед каждым тестом TRUNCATE/seed только в базе с суффиксом `_test`; рабочую базу передавать нельзя. Не запускайте одновременно второй набор, сборку или линтер. `npm test` — сохранившийся отдельный smoke-тест корневого контроллера; основной контракт ЛР3 проверяет `test:integration`.

Тесты включают HTTP-гонку 2×80 МиБ на 100 МиБ, управляемую блокировку COMMIT/ROLLBACK, ошибку FK после резервирования, сохранение после перезапуска Nest, hidden/draft, курсор с одинаковыми датами и bigint больше MAX_SAFE_INTEGER. Лог проверки: `docs/lab3/evidence/integration.log`.

## SQL, миграция заполненной БД и планы

```bash
# Из maxim-nest-project, после build. Эти две базы одноразовые!
DATABASE_URL=postgres://vidnest:vidnest_demo@127.0.0.1:5433/vidnest npm run db:measure
DATABASE_URL=postgres://vidnest:vidnest_demo@127.0.0.1:5433/vidnest node scripts/join-analysis.mjs
```

measure сбрасывает public только в явно названных `vidnest_measure` и `vidnest_migration_test`. В первой создаёт расширенный seed, снимает по 3 плана до/после индексов; во второй проверяет изменение 40 существующих строк, rollback/reapply Comments и 12 SQL с фиксированными ожиданиями. Рабочая vidnest не сбрасывается. Сохранение результатов — в `docs/lab3/evidence/`. join-analysis запускается после measure и сохраняет разбор LEFT JOIN и размножения связей.

## Demo-доступ

Для учебного режима установлены `NODE_ENV=development` и `DEMO_AUTH=true`. `X-Demo-User` выбирает существующего пользователя из БД (в seed 1–6, новые профили также поддерживаются). Guard проверяет существование id. Это не аутентификация. В production и при DEMO_AUTH≠true такой контекст запрещён. Публичное чтение работает без заголовка. Каналы 1 и 7 принадлежат пользователю 1, канал 8 пользователю 2. Нельзя передать ownerId в теле.

## Восемь операций API

```bash
# 1. Создать draft; sizeBytes — строка, id — integer.
curl -i http://localhost:3000/videos -H 'Content-Type: application/json' -H 'X-Demo-User: 1' -d '{"channelId":1,"title":"Новое видео","description":"Учебная запись","sizeBytes":"5000","tagIds":[1,2]}'
# 2. Каталог: 200 {items,nextCursor}; q — буквальная подстрока title.
curl 'http://localhost:3000/videos?limit=5&channelId=1'
# Для следующей страницы добавьте &cursor=<nextCursor>, сохранив фильтры.
# 3. Карточка: 200 для published или своего draft; иначе 404.
curl http://localhost:3000/videos/1
# 4. Редактирование: 200; sizeBytes и channelId здесь запрещены.
curl -X PATCH http://localhost:3000/videos/1 -H 'Content-Type: application/json' -H 'X-Demo-User: 1' -d '{"title":"Обновлённое видео"}'
# 5. Статус: 200. Для только что созданного draft подставьте id из POST.
curl -X PATCH http://localhost:3000/videos/1/status -H 'Content-Type: application/json' -H 'X-Demo-User: 1' -d '{"status":"published"}'
# 6. Добавление: 204 и при повторе.
curl -i -X PUT http://localhost:3000/me/favorites/1 -H 'X-Demo-User: 1'
# 7. Удаление: 204 и при повторе.
curl -i -X DELETE http://localhost:3000/me/favorites/1 -H 'X-Demo-User: 1'
# 8. Избранное: 200, только published.
curl http://localhost:3000/me/favorites -H 'X-Demo-User: 1'
```

POST возвращает, например, `{id:41,title:"Новое видео",status:"draft",sizeBytes:"5000",createdAt:"…Z",publishedAt:null,channelId:1,channelTitle:"Channel 1",author:"User 1",commentsEnabled:true,description:"Учебная запись"}`. Даты ISO 8601 UTC. Ошибки Nest: `{statusCode,message,error}`; 400 — DTO/ссылка, 401 — нет demo-пользователя, 403 — чужая запись/выключенный demo, 404 — нет доступной карточки, 409 — квота. Неизвестная ошибка → 500 и внутренний лог.

## Границы

Только метаданные; удаление/изменение размера и изменение квоты через API отсутствуют. used_bytes поддерживает транзакционный путь создания; привилегированный ручной DML способен нарушить сумму. POST не реализует ключ идемпотентности. Полноценные auth, история, рекомендации, сами комментарии и outbox/worker — дальнейшая работа. API и интерфейс плейлистов реализованы.
