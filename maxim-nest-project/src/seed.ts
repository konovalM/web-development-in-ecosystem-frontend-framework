import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { VideoService } from './video/video.service.js';
import { DEFAULT_VIDEOS } from './video/videos.seed.js';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const videoService = app.get(VideoService);
  const seeded = videoService.seed(DEFAULT_VIDEOS);
  console.log(`Seeded ${seeded.length} videos:`);
  for (const video of seeded) {
    console.log(`  - [${video.id}] ${video.title}`);
  }
  await app.close();
}

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
