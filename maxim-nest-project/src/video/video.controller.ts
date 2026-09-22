import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateVideoDto } from './dto/create-video.dto.js';
import { FilterVideoDto } from './dto/filter-video.dto.js';
import { VideoService } from './video.service.js';
import type { Video } from './video.service.js';

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Get()
  findAll(@Query() filter: FilterVideoDto): Video[] {
    return this.videoService.findAll(filter);
  }

  @Get(':id')
  findById(@Param('id') id: string): Video {
    return this.videoService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateVideoDto): Video {
    return this.videoService.create(dto);
  }
}
