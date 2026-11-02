import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { DemoIdentityGuard } from './database/demo-identity.guard.js';
import { DatabaseErrorFilter } from './database/database-error.filter.js';
import { LibraryModule } from './library/library.module.js';
import { DatabaseModule } from './database/database.module.js';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { VideoModule } from './video/video.module.js';
import { FavoritesModule } from './favorites/favorites.module.js';

@Module({
  imports: [DatabaseModule, VideoModule, FavoritesModule, LibraryModule],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: DemoIdentityGuard },
    { provide: APP_FILTER, useClass: DatabaseErrorFilter },
  ],
})
export class AppModule {}
