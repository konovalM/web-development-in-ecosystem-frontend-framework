import { Injectable } from '@nestjs/common';
import { Video, VideoService } from '../video/video.service.js';

interface Favorite {
  userId: string;
  videoId: string;
}

const DEFAULT_USER = 'me';

@Injectable()
export class FavoritesService {
  private favorites: Favorite[] = [];

  constructor(private readonly videoService: VideoService) {}

  add(videoId: string, userId: string = DEFAULT_USER): Video[] {
    // Бросит NotFoundException, если такого видео нет.
    this.videoService.findOne(videoId);

    const alreadyAdded = this.favorites.some(
      (fav) => fav.userId === userId && fav.videoId === videoId,
    );
    if (!alreadyAdded) {
      this.favorites.push({ userId, videoId });
    }

    return this.list(userId);
  }

  remove(videoId: string, userId: string = DEFAULT_USER): Video[] {
    this.favorites = this.favorites.filter(
      (fav) => !(fav.userId === userId && fav.videoId === videoId),
    );
    return this.list(userId);
  }

  list(userId: string = DEFAULT_USER): Video[] {
    return this.favorites
      .filter((fav) => fav.userId === userId)
      .map((fav) => this.videoService.findOne(fav.videoId));
  }
}
