import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '@app/data';

/** Extracts the AuthUser that JwtAuthGuard attaches to the request. */
export const CurrentUser = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): AuthUser => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);
