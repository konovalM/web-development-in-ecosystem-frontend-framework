# VidNest backend — ЛР3

Инструкции запуска, миграций, seed, API и PostgreSQL-тестов находятся в [корневом README](../README.md). Полный [отчёт](../docs/lab3/report.md) и [конспект лекций](../docs/lecture-notes.md) хранятся в docs.

Основные команды после `npm ci`: `npm run build`, `npm run db:migrate`, `npm run seed`, `npm run start:dev`. Подключение через `.env` по образцу `.env.example`.

Интеграционные проверки: `TEST_DATABASE_URL=postgres://vidnest:vidnest_demo@127.0.0.1:5433/vidnest_test npm run test:integration`. Требуется отдельная база с суффиксом `_test`; fixture восстанавливается перед каждым тестом.
