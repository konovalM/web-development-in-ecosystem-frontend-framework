import { Controller, Get, Param } from '@nestjs/common';
import { Video, VideoService } from './video.service.js';

@Controller('video')
export class VideoController {
    constructor(private readonly videoService: VideoService) {}

    @Get()
    findAll(): Video[] {
        return this.videoService.findAll();
    }

    @Get(':id')
    findById(@Param('id') id: string): Video | undefined {
        return this.videoService.findOne(id);
    }
}
