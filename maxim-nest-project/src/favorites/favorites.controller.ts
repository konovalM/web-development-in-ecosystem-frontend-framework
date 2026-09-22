import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { Video } from '../video/video.service.js';
import { AddFavoriteDto } from './dto/add-favorite.dto.js';
import { FavoritesService } from './favorites.service.js';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  list(@Query('userId') userId?: string): Video[] {
    return this.favoritesService.list(userId);
  }

  @Post()
  add(@Body() dto: AddFavoriteDto): Video[] {
    return this.favoritesService.add(dto.videoId, dto.userId);
  }

  @Delete(':videoId')
  remove(
    @Param('videoId') videoId: string,
    @Query('userId') userId?: string,
  ): Video[] {
    return this.favoritesService.remove(videoId, userId);
  }
}
