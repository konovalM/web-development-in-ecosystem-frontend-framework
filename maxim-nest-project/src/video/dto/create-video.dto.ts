import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export const VIDEO_FORMATS = ['mp4', 'mov', 'webm', 'mkv'];
export const VIDEO_STATUSES = ['processing', 'published', 'blocked'];
export type VideoStatus = 'processing' | 'published' | 'blocked';

export class CreateVideoDto {
  @IsString()
  @Length(3, 100, { message: 'Название должно быть от 3 до 100 символов' })
  title: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000, { message: 'Описание не длиннее 1000 символов' })
  description?: string;

  @IsUrl({}, { message: 'Ссылка должна быть корректным URL' })
  @Matches(/\.(mp4|mov|webm|mkv)(\?.*)?$/i, {
    message: 'Поддерживаются только форматы: mp4, mov, webm, mkv',
  })
  url: string;

  @IsInt({ message: 'Длительность — целое число секунд' })
  @Min(1, { message: 'Длительность должна быть больше нуля' })
  @Max(21600, { message: 'Слишком длинное видео (лимит 6 часов)' })
  duration: number;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2048, { message: 'Превышен лимит размера файла (2048 МБ)' })
  size?: number;

  @IsOptional()
  @IsIn(VIDEO_STATUSES, { message: 'Недопустимый статус видео' })
  status?: VideoStatus;
}
