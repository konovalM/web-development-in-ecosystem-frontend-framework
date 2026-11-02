import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { LibraryService } from './library.service.js';
import {
  ChannelDto,
  OrderDto,
  TagDto,
  TagsDto,
  TitleDto,
  UserDto,
  VideoIdDto,
} from './library.dto.js';
import { demoUser } from '../database/demo-user.js';
import { PositiveIdPipe } from '../database/positive-id.pipe.js';
import { VideoService } from '../video/video.service.js';
import { FilterVideoDto } from '../video/dto/filter-video.dto.js';
@Controller()
export class LibraryController {
  constructor(
    private readonly lib: LibraryService,
    private readonly videos: VideoService,
  ) {}
  @Get('users') users(@Headers('x-demo-user') u?: string) {
    demoUser(u);
    return this.lib.users();
  }
  @Post('users') createUser(
    @Body() d: UserDto,
    @Headers('x-demo-user') u?: string,
  ) {
    demoUser(u);
    return this.lib.createUser(d);
  }
  @Patch('me') profile(@Body() d: UserDto, @Headers('x-demo-user') u?: string) {
    return this.lib.profile(demoUser(u)!, d);
  }
  @Delete('me') @HttpCode(204) async deleteUser(
    @Headers('x-demo-user') u?: string,
  ) {
    await this.lib.deleteUser(demoUser(u)!);
  }
  @Get('channels') channels() {
    return this.lib.channels();
  }
  @Post('channels') channel(
    @Body() d: ChannelDto,
    @Headers('x-demo-user') u?: string,
  ) {
    return this.lib.createChannel(demoUser(u)!, d);
  }
  @Patch('channels/:id') renameChannel(
    @Param('id', PositiveIdPipe) id: number,
    @Body() d: TitleDto,
    @Headers('x-demo-user') u?: string,
  ) {
    return this.lib.renameChannel(id, demoUser(u)!, d.title);
  }
  @Delete('channels/:id') @HttpCode(204) async deleteChannel(
    @Param('id', PositiveIdPipe) id: number,
    @Headers('x-demo-user') u?: string,
  ) {
    await this.lib.deleteChannel(id, demoUser(u)!);
  }
  @Get('tags') tags() {
    return this.lib.tags();
  }
  @Post('tags') tag(@Body() d: TagDto, @Headers('x-demo-user') u?: string) {
    demoUser(u);
    return this.lib.createTag(d.name);
  }
  @Patch('tags/:id') renameTag(
    @Param('id', PositiveIdPipe) id: number,
    @Body() d: TagDto,
    @Headers('x-demo-user') u?: string,
  ) {
    demoUser(u);
    return this.lib.renameTag(id, d.name);
  }
  @Delete('tags/:id') @HttpCode(204) async deleteTag(
    @Param('id', PositiveIdPipe) id: number,
    @Headers('x-demo-user') u?: string,
  ) {
    demoUser(u);
    await this.lib.deleteTag(id);
  }
  @Put('videos/:id/tags') videoTags(
    @Param('id', PositiveIdPipe) id: number,
    @Body() d: TagsDto,
    @Headers('x-demo-user') u?: string,
  ) {
    return this.lib.videoTags(id, demoUser(u)!, d.tagIds);
  }
  @Get('me/videos') myVideos(
    @Query() q: FilterVideoDto,
    @Headers('x-demo-user') u?: string,
  ) {
    return this.videos.findAll(q, demoUser(u)!);
  }
  @Get('me/playlists') playlists(@Headers('x-demo-user') u?: string) {
    return this.lib.playlists(demoUser(u)!);
  }
  @Post('me/playlists') createPlaylist(
    @Body() d: TitleDto,
    @Headers('x-demo-user') u?: string,
  ) {
    return this.lib.createPlaylist(demoUser(u)!, d.title);
  }
  @Get('me/playlists/:id') playlist(
    @Param('id', PositiveIdPipe) id: number,
    @Headers('x-demo-user') u?: string,
  ) {
    return this.lib.playlist(id, demoUser(u)!);
  }
  @Patch('me/playlists/:id') renamePlaylist(
    @Param('id', PositiveIdPipe) id: number,
    @Body() d: TitleDto,
    @Headers('x-demo-user') u?: string,
  ) {
    return this.lib.renamePlaylist(id, demoUser(u)!, d.title);
  }
  @Delete('me/playlists/:id') @HttpCode(204) async deletePlaylist(
    @Param('id', PositiveIdPipe) id: number,
    @Headers('x-demo-user') u?: string,
  ) {
    await this.lib.deletePlaylist(id, demoUser(u)!);
  }
  @Post('me/playlists/:id/items') add(
    @Param('id', PositiveIdPipe) id: number,
    @Body() d: VideoIdDto,
    @Headers('x-demo-user') u?: string,
  ) {
    return this.lib.addItem(id, demoUser(u)!, d.videoId);
  }
  @Put('me/playlists/:id/order') order(
    @Param('id', PositiveIdPipe) id: number,
    @Body() d: OrderDto,
    @Headers('x-demo-user') u?: string,
  ) {
    return this.lib.order(id, demoUser(u)!, d.videoIds);
  }
  @Delete('me/playlists/:id/items/:video') remove(
    @Param('id', PositiveIdPipe) id: number,
    @Param('video', PositiveIdPipe) video: number,
    @Headers('x-demo-user') u?: string,
  ) {
    return this.lib.removeItem(id, demoUser(u)!, video);
  }
}
