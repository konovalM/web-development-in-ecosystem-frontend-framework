import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
export function demoUser(
  header: string | undefined,
  optional = false,
): number | undefined {
  if (!header && optional) return undefined;
  if (
    process.env.DEMO_AUTH !== 'true' ||
    !['development', 'test'].includes(process.env.NODE_ENV ?? '')
  )
    throw new ForbiddenException('Demo authentication is disabled');
  if (!header)
    throw new UnauthorizedException('Use X-Demo-User in local demo mode');
  if (!/^[1-9][0-9]*$/.test(header) || Number(header) > 2147483647)
    throw new BadRequestException('Demo user must be a positive integer');
  return Number(header);
}
