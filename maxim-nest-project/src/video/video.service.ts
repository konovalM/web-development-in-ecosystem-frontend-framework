import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
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

const DATA_FILE = process.env.DATA_FILE ?? 'data/videos.json';

@Injectable()
export class VideoService {
  private read(): Video[] {
    if (!existsSync(DATA_FILE)) {
      return [];
    }
    try {
      return JSON.parse(readFileSync(DATA_FILE, 'utf-8')) as Video[];
    } catch {
      return [];
    }
  }

  private write(videos: Video[]): void {
    mkdirSync(dirname(DATA_FILE), { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(videos, null, 2));
  }

  seed(videos: Video[]): Video[] {
    this.write(videos);
    return videos;
  }

  findAll(filter: FilterVideoDto = {}): Video[] {
    let result = this.read();

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
    const video = this.read().find((item) => item.id === id);

    if (!video) {
      throw new NotFoundException(`Видео с id ${id} не найдено`);
    }

    return video;
  }

  create(dto: CreateVideoDto): Video {
    const videos = this.read();
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

    videos.push(video);
    this.write(videos);
    return video;
  }
}
