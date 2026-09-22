import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, 
      transform: true, 
    }),
  );

  const port = process.env.PORT ?? 3000;
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  await app.listen(port);
  console.log(`Backend запущен: PORT=${port}, NODE_ENV=${nodeEnv}`);
}
await bootstrap();
