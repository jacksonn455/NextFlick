import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

export const USER_ID_HEADER = 'x-user-id';

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

// There is no auth yet: the user is whoever the client says it is in the header.
// Whether that user exists is checked by the service (404 when it doesn't).
export function resolveUserId(header: string | string[] | undefined): string {
  const value = (Array.isArray(header) ? header[0] : header)?.trim();

  if (!value) {
    throw new BadRequestException(`The ${USER_ID_HEADER} header is required`);
  }

  if (!OBJECT_ID_PATTERN.test(value)) {
    throw new BadRequestException(
      `Invalid ${USER_ID_HEADER} header: expected a user id (24 hex characters)`,
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
