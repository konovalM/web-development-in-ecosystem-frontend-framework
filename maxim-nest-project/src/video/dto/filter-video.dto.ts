import { IsIn, IsOptional, IsString } from 'class-validator';
import { VIDEO_STATUSES, type VideoStatus } from './create-video.dto.js';

/**
 * Query-параметры для GET /video. По title ищем подстроку в названии,
 * авторе и теме (регистр не важен), theme/status — точные фильтры.
 */
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
