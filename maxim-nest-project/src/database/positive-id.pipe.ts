import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
@Injectable()
export class PositiveIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (!/^[1-9][0-9]*$/.test(value) || Number(value) > 2147483647) {
      throw new BadRequestException('ID must be a positive PostgreSQL integer');
    }
    return Number(value);
  }
}
