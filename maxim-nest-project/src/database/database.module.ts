import { Global, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createDataSource } from './data-source.js';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(private readonly db: DataSource) {}
  async onApplicationShutdown() {
    if (this.db.isInitialized) await this.db.destroy();
  }
}
@Global()
@Module({
  providers: [
    {
      provide: DataSource,
      useFactory: async () => createDataSource().initialize(),
    },
    DatabaseLifecycle,
  ],
  exports: [DataSource],
})
export class DatabaseModule {}
