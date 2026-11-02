import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { demoUser } from './demo-user.js';
@Injectable()
export class DemoIdentityGuard implements CanActivate {
  constructor(private readonly db: DataSource) {}
  async canActivate(ctx: ExecutionContext) {
    const header = ctx.switchToHttp().getRequest().headers['x-demo-user'];
    if (header === undefined) return true;
    const user = demoUser(header);
    if (
      !(await this.db.query('SELECT id FROM users WHERE id=$1', [user])).length
    )
      throw new BadRequestException('Demo-пользователь не найден');
    return true;
  }
}
