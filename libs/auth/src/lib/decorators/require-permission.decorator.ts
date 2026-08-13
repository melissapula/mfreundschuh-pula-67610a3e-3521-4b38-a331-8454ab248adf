import { SetMetadata } from '@nestjs/common';
import { Permission } from '@app/data';

export const PERMISSION_KEY = 'requiredPermission';

/** Declares the Permission a route requires; enforced by PermissionsGuard. */
export const RequirePermission = (permission: Permission) =>
    SetMetadata(PERMISSION_KEY, permission);
