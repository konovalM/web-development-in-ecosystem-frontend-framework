# Разбор реальных EXPLAIN (ANALYZE, BUFFERS)


Источник: evidence/plans.json; PostgreSQL 17.11; 10 040 videos, 30 078 video_tags, 308 channels. Три последовательных повтора на каждой фазе, неизменные SQL/параметры.


## before: catalog

```sql
SELECT id,title,published_at FROM videos WHERE status='published' ORDER BY published_at DESC,id DESC LIMIT 20;
```

Время исполнения (мс): 1.671, 1.664, 1.536.

Третий повтор (дерево, actual/estimated rows, loops и buffers):

```text

Node Type: Limit; Plan Rows: 20; Actual Rows: 20; Actual Loops: 1; Shared Hit Blocks: 153; Shared Read Blocks: 0; Actual Total Time: 1.527
  Node Type: Sort; Plan Rows: 8028; Actual Rows: 20; Actual Loops: 1; Sort Method: top-N heapsort; Sort Space Used: 27; Shared Hit Blocks: 153; Shared Read Blocks: 0; Actual Total Time: 1.525
    Node Type: Seq Scan; Plan Rows: 8028; Actual Rows: 8028; Actual Loops: 1; Rows Removed by Filter: 2012; Shared Hit Blocks: 153; Shared Read Blocks: 0; Actual Total Time: 0.798

```

## before: channel

```sql
SELECT id,title,created_at FROM videos WHERE channel_id=9 ORDER BY created_at DESC,id DESC LIMIT 20;
```

Время исполнения (мс): 1.228, 1.194, 1.201.

Третий повтор (дерево, actual/estimated rows, loops и buffers):

```text

Node Type: Limit; Plan Rows: 20; Actual Rows: 20; Actual Loops: 1; Shared Hit Blocks: 153; Shared Read Blocks: 0; Actual Total Time: 1.193
  Node Type: Sort; Plan Rows: 5000; Actual Rows: 20; Actual Loops: 1; Sort Method: top-N heapsort; Sort Space Used: 27; Shared Hit Blocks: 153; Shared Read Blocks: 0; Actual Total Time: 1.191
    Node Type: Seq Scan; Plan Rows: 5000; Actual Rows: 5000; Actual Loops: 1; Rows Removed by Filter: 5040; Shared Hit Blocks: 153; Shared Read Blocks: 0; Actual Total Time: 0.507

```

## after: catalog

```sql
SELECT id,title,published_at FROM videos WHERE status='published' ORDER BY published_at DESC,id DESC LIMIT 20;
```

Время исполнения (мс): 0.027, 0.017, 0.014.

Третий повтор (дерево, actual/estimated rows, loops и buffers):

```text

Node Type: Limit; Plan Rows: 20; Actual Rows: 20; Actual Loops: 1; Shared Hit Blocks: 4; Shared Read Blocks: 0; Actual Total Time: 0.01
  Node Type: Index Scan; Index Name: ix_catalog; Plan Rows: 8028; Actual Rows: 20; Actual Loops: 1; Shared Hit Blocks: 4; Shared Read Blocks: 0; Actual Total Time: 0.009

```

## after: channel

```sql
SELECT id,title,created_at FROM videos WHERE channel_id=9 ORDER BY created_at DESC,id DESC LIMIT 20;
```

Время исполнения (мс): 0.033, 0.019, 0.019.

Третий повтор (дерево, actual/estimated rows, loops и buffers):

```text

Node Type: Limit; Plan Rows: 20; Actual Rows: 20; Actual Loops: 1; Shared Hit Blocks: 4; Shared Read Blocks: 0; Actual Total Time: 0.012
  Node Type: Index Scan; Index Name: ix_channel; Plan Rows: 5000; Actual Rows: 20; Actual Loops: 1; Shared Hit Blocks: 4; Shared Read Blocks: 0; Actual Total Time: 0.011

```

До индексов Seq Scan просматривает набор и Sort выбирает top-N. После выбран упорядоченный Index Scan, Limit останавливает чтение после 20 строк. Снижаются число прочитанных страниц и объём сортировки. Числа не следует переносить на другие машины: все повторы локальные, кэш в ходе измерения прогревается. Сравнение отражает этот fixture, а не универсальный коэффициент ускорения.


Размеры индексов: ix_catalog: 270336 байт, ix_channel: 425984 байт, ix_favorites: 16384 байт. Поддержка индексов увеличивает стоимость записи; ix_favorites включён как кандидат под фактический ORDER BY избранного, отдельный эксперимент для него не заявлен.
