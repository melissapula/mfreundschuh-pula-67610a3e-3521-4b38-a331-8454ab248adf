import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser, Permission } from '@app/data';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { roleHasPermission } from '../role-permissions';

/**
 * Runs after JwtAuthGuard (see apps/api's global guard order), so
 * request.user is already populated. Routes with no @RequirePermission
 * metadata are allowed through — this guard only enforces what's declared.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<Permission | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.user;
    if (!user) {
      throw new ForbiddenException('No authenticated user on request');
    }

    if (!roleHasPermission(user.role, requiredPermission)) {
      throw new ForbiddenException(
        `Role ${user.role} does not have permission ${requiredPermission}`,
      );
    }

    return true;
  }
}
