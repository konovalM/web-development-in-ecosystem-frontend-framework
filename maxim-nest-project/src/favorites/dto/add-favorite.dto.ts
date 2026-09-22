import { IsOptional, IsString } from 'class-validator';

export class AddFavoriteDto {
  @IsString({ message: 'Нужен id видео' })
  videoId: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
