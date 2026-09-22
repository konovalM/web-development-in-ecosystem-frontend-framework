import { IsIn, IsOptional, IsString } from 'class-validator';
import { VIDEO_STATUSES, type VideoStatus } from './create-video.dto.js';

export class FilterVideoDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsIn(VIDEO_STATUSES, { message: 'Недопустимый статус видео' })
  status?: VideoStatus;
}
