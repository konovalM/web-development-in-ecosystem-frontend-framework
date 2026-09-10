import { Injectable, NotFoundException } from '@nestjs/common';

export class CreateVideoDto{
    title: string;
    description: string;
    url: string;
    duration: number;
}

export interface Video {
    id: string;
    title: string;
    description: string;
    url: string;
    duration: number;
}

@Injectable()
export class VideoService {
    private readonly videos: Video[] = [{
        id: '1',
        title: 'Video 1',
        description: 'Description 1',
        url: 'https://samplelib.com/mp4/sample-5s.mp4',
        duration: 120
    }, {
        id: '2',
        title: 'Video 2',
        description: 'Description 2',
        url: 'https://samplelib.com/mp4/sample-5s.mp4',
        duration: 90
    }];

    findAll(): Video[] {
        return this.videos;
    }

    findOne(id: string): Video {
        const video = this.videos.find(video => video.id === id);

        if (!video) {
            throw new NotFoundException(`Video with ID ${id} not found`);
        }
        
        return video;
    }

    create(dto: CreateVideoDto): Video {
        const video: Video = {
            id: Math.random().toString(36).substr(2, 9).toString(),
            ...dto,
        };
        this.videos.push(video);
        return video;
    }

    // remove

    // update
}