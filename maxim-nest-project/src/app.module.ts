import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { VideoModule } from './video/video.module.js';
import { FavoritesModule } from './favorites/favorites.module.js';

@Module({
  imports: [VideoModule, FavoritesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
