import { Module } from '@nestjs/common';
import { VideoModule } from '../video/video.module.js';
import { LibraryController } from './library.controller.js';
import { LibraryService } from './library.service.js';
@Module({
  imports: [VideoModule],
  controllers: [LibraryController],
  providers: [LibraryService],
})
export class LibraryModule {}
