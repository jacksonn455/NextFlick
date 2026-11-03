import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

export const USER_ID_HEADER = 'x-user-id';
// Used when no header is sent, so clients that don't pick a user keep working
export const DEFAULT_USER_ID = 'user-123';

const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,50}$/;

// There is no auth yet: the user is whoever the client says it is in the header
export function resolveUserId(header: string | string[] | undefined): string {
  const value = (Array.isArray(header) ? header[0] : header)?.trim();

  if (!value) {
    return DEFAULT_USER_ID;
  }

  if (!USER_ID_PATTERN.test(value)) {
    throw new BadRequestException(
      `Invalid ${USER_ID_HEADER} header: use 1-50 letters, numbers, "-" or "_"`,
    );
  }

  return value;
}

export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return resolveUserId(request.headers[USER_ID_HEADER]);
  },
);
