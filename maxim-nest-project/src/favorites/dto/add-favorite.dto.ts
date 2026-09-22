import { IsOptional, IsString } from 'class-validator';

export class AddFavoriteDto {
  @IsString({ message: 'Нужен id видео' })
  videoId: string;

  // Условный пользователь. Если не передан — используем 'me'.
  @IsOptional()
  @IsString()
  userId?: string;
}
