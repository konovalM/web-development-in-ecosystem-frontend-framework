import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsUrl,
  IsInt,
  Min,
  Max,
  IsString,
  Length,
  IsOptional,
  MaxLength,
  Matches,
  IsArray,
  ArrayUnique,
  ArrayMaxSize,
} from 'class-validator';
class VideoOptionsDto {
  @IsOptional() @IsBoolean() commentsEnabled?: boolean;
  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(2048)
  playbackUrl?: string | null;
}
export class CreateVideoDto extends VideoOptionsDto {
  @IsInt() @Min(1) @Max(2147483647) channelId!: number;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 100)
  title!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsString() @Matches(/^[1-9][0-9]{0,18}$/) sizeBytes!: string;
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(2147483647, { each: true })
  tagIds!: number[];
}
export class UpdateVideoDto extends VideoOptionsDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(2147483647, { each: true })
  tagIds?: number[];

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 100)
  title?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
}
