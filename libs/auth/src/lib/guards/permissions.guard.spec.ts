import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser, Permission, Role } from '@app/data';
import { PermissionsGuard } from './permissions.guard';

function makeContext(user: AuthUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  const viewer: AuthUser = { sub: 'u1', email: 'v@acme.test', role: Role.VIEWER, organizationId: 'acme' };
  const admin: AuthUser = { sub: 'u2', email: 'a@acme.test', role: Role.ADMIN, organizationId: 'acme' };

  function guardWithRequiredPermission(permission: Permission | undefined) {
    const reflector = { getAllAndOverride: () => permission } as unknown as Reflector;
    return new PermissionsGuard(reflector);
  }

  it('allows the request through when the route declares no @RequirePermission', () => {
    const guard = guardWithRequiredPermission(undefined);
    expect(guard.canActivate(makeContext(viewer))).toBe(true);
  });

  it('allows a role that has the required permission', () => {
    const guard = guardWithRequiredPermission(Permission.TASK_CREATE);
    expect(guard.canActivate(makeContext(admin))).toBe(true);
  });

  it('denies a role that lacks the required permission', () => {
    const guard = guardWithRequiredPermission(Permission.TASK_CREATE);
    expect(() => guard.canActivate(makeContext(viewer))).toThrow(ForbiddenException);
  });

  it('denies when there is no authenticated user on the request', () => {
    const guard = guardWithRequiredPermission(Permission.TASK_READ);
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });
});
