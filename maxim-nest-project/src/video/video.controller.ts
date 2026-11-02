import { PositiveIdPipe } from '../database/positive-id.pipe.js';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Query,
  Headers,
} from '@nestjs/common';
import {
  CreateVideoDto,
  UpdateVideoDto,
  FilterVideoDto,
  StatusDto,
} from './dto/index.js';
import { VideoService } from './video.service.js';
import { demoUser } from '../database/demo-user.js';
@Controller('videos')
export class VideoController {
  constructor(private readonly service: VideoService) {}
  @Get() list(@Query() q: FilterVideoDto) {
    return this.service.findAll(q);
  }
  @Get(':id') get(
    @Param('id', PositiveIdPipe) id: number,
    @Headers('x-demo-user') user?: string,
  ) {
    return this.service.findOne(id, demoUser(user, true));
  }
  @Post() create(
    @Body() dto: CreateVideoDto,
    @Headers('x-demo-user') user?: string,
  ) {
    return this.service.create(dto, demoUser(user)!);
  }
  @Patch(':id') update(
    @Param('id', PositiveIdPipe) id: number,
    @Body() dto: UpdateVideoDto,
    @Headers('x-demo-user') user?: string,
  ) {
    return this.service.update(id, dto, demoUser(user)!);
  }
  @Patch(':id/status') status(
    @Param('id', PositiveIdPipe) id: number,
    @Body() dto: StatusDto,
    @Headers('x-demo-user') user?: string,
  ) {
    return this.service.status(id, dto.status, demoUser(user)!);
  }
}
