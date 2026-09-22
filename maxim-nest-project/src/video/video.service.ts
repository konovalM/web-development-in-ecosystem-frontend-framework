import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateVideoDto,
  FilterVideoDto,
  VideoStatus,
} from './dto/index.js';

export interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  duration: number;
  theme: string;
  author: string;
  status: VideoStatus;
}

@Injectable()
export class VideoService {
  private readonly videos: Video[] = [
    {
      id: '1',
      title: 'Video 1',
      description: 'Description 1',
      url: 'https://samplelib.com/mp4/sample-5s.mp4',
      duration: 120,
      theme: 'backend',
      author: 'maxim',
      status: 'published',
    },
    {
      id: '2',
      title: 'Video 2',
      description: 'Description 2',
      url: 'https://samplelib.com/mp4/sample-5s.mp4',
      duration: 90,
      theme: 'frontend',
      author: 'maxim',
      status: 'published',
    },
  ];

  findAll(filter: FilterVideoDto = {}): Video[] {
    let result = this.videos;

    if (filter.title) {
      const q = filter.title.trim().toLowerCase();
      result = result.filter(
        (video) =>
          video.title.toLowerCase().includes(q) ||
          video.author.toLowerCase().includes(q) ||
          video.theme.toLowerCase().includes(q),
      );
    }

    if (filter.theme) {
      result = result.filter((video) => video.theme === filter.theme);
    }

    if (filter.status) {
      result = result.filter((video) => video.status === filter.status);
    }

    return result;
  }

  findOne(id: string): Video {
    const video = this.videos.find((item) => item.id === id);

    if (!video) {
      throw new NotFoundException(`Видео с id ${id} не найдено`);
    }

    return video;
  }

  create(dto: CreateVideoDto): Video {
    const video: Video = {
      id: Math.random().toString(36).slice(2, 11),
      title: dto.title,
      description: dto.description ?? '',
      url: dto.url,
      duration: dto.duration,
      theme: dto.theme ?? 'other',
      author: dto.author ?? 'me',
      status: dto.status ?? 'processing',
    };

    this.videos.push(video);
    return video;
  }
}
