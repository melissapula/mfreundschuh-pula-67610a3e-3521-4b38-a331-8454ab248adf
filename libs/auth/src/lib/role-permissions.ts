import { Permission, Role } from '@app/data/browser';

/**
 * Each tier is defined as the tier below it plus what that role adds —
 * inheritance is structural, not just documented in a comment.
 */
const VIEWER_PERMISSIONS: Permission[] = [Permission.TASK_READ];

const ADMIN_PERMISSIONS: Permission[] = [
    ...VIEWER_PERMISSIONS,
    Permission.TASK_CREATE,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.AUDIT_READ,
];

/**
 * Owner has no additional permission *types* over Admin in this endpoint
 * surface (there's no org/user-management API in scope). Owner's real
 * distinction is org SCOPE, not capability — see org-scope.ts. Kept as its
 * own entry (rather than reusing ADMIN_PERMISSIONS) so a future Owner-only
 * capability has an obvious place to be added.
 */
const OWNER_PERMISSIONS: Permission[] = [...ADMIN_PERMISSIONS];

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
    [Role.VIEWER]: new Set(VIEWER_PERMISSIONS),
    [Role.ADMIN]: new Set(ADMIN_PERMISSIONS),
    [Role.OWNER]: new Set(OWNER_PERMISSIONS),
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role].has(permission);
}

export function permissionsForRole(role: Role): Permission[] {
    return Array.from(ROLE_PERMISSIONS[role]);
}
