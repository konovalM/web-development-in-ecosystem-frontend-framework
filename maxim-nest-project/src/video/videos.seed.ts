import type { Video } from './video.service.js';

export const DEFAULT_VIDEOS: Video[] = [
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
  {
    id: 'q1qn6x3w0',
    title: 'Работа на паре 22.09',
    description: 'а посмотреть видео по приколу',
    url: 'https://samplelib.com/mp4/sample-5s.mp4',
    duration: 10,
    theme: 'backend+frontend',
    author: 'ii4elka',
    status: 'processing',
  },
];
