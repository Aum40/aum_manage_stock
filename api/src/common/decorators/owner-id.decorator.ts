import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves the shop owner that owns the requested data.
 *
 * TODO(auth): reads the `x-user-id` header for now because
 * feature/auth-resource has not merged yet. Once the JWT guard populates
 * `request.user`, swap the body of this decorator for that lookup and every
 * controller and service keeps working unchanged.
 *
 * When the caller is a staff member this has to resolve to their
 * `users.owner_id`, because categories belong to the owner and not to whoever
 * created them.
 */
export const OwnerId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const ownerId = request.headers['x-user-id'];

    if (typeof ownerId !== 'string' || !UUID_PATTERN.test(ownerId)) {
      throw new BadRequestException(
        'Header "x-user-id" must be a UUID until authentication is available',
      );
    }

    return ownerId;
  },
);
