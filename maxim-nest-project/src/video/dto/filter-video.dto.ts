import { Type } from 'class-transformer';
import {
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  MaxLength,
  IsIn,
} from 'class-validator';
export class FilterVideoDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  channelId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() @MaxLength(200) cursor?: string;
}
export class StatusDto {
  @IsIn(['published', 'hidden']) status!: 'published' | 'hidden';
}
