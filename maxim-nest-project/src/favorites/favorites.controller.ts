import { PositiveIdPipe } from '../database/positive-id.pipe.js';
import {
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service.js';
import { demoUser } from '../database/demo-user.js';
@Controller('me/favorites')
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}
  @Get() list(@Headers('x-demo-user') u?: string) {
    return this.service.list(demoUser(u)!);
  }
  @Put(':id') @HttpCode(204) async add(
    @Param('id', PositiveIdPipe) id: number,
    @Headers('x-demo-user') u?: string,
  ) {
    await this.service.add(id, demoUser(u)!);
  }
  @Delete(':id') @HttpCode(204) async remove(
    @Param('id', PositiveIdPipe) id: number,
    @Headers('x-demo-user') u?: string,
  ) {
    await this.service.remove(id, demoUser(u)!);
  }
}
