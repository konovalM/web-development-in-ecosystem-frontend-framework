import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Initial1800000000000 } from './migrations/initial.js';
import { Comments1800000000001 } from './migrations/comments.js';
import { Indexes1800000000002 } from './migrations/indexes.js';
import { Playback1800000000003 } from './migrations/playback.js';
export function createDataSource(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL is required');
  return new DataSource({
    type: 'postgres',
    url,
    synchronize: false,
    migrations: [
      Initial1800000000000,
      Comments1800000000001,
      Indexes1800000000002,
      Playback1800000000003,
    ],
    extra: {
      max: 4,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
      lock_timeout: 5000,
    },
  });
}
