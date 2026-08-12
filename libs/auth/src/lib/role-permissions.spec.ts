import { Permission, Role } from '@app/data/browser';
import { permissionsForRole, roleHasPermission } from './role-permissions';

describe('role-permissions', () => {
  it('gives Viewer read-only access', () => {
    expect(roleHasPermission(Role.VIEWER, Permission.TASK_READ)).toBe(true);
    expect(roleHasPermission(Role.VIEWER, Permission.TASK_CREATE)).toBe(false);
    expect(roleHasPermission(Role.VIEWER, Permission.TASK_UPDATE)).toBe(false);
    expect(roleHasPermission(Role.VIEWER, Permission.TASK_DELETE)).toBe(false);
    expect(roleHasPermission(Role.VIEWER, Permission.AUDIT_READ)).toBe(false);
  });

  it('gives Admin full task CRUD plus audit read, inheriting Viewer read', () => {
    for (const permission of Object.values(Permission)) {
      expect(roleHasPermission(Role.ADMIN, permission)).toBe(true);
    }
  });

  it('gives Owner everything Admin has (inheritance holds even with no Owner-only permission today)', () => {
    const adminPerms = new Set(permissionsForRole(Role.ADMIN));
    const ownerPerms = new Set(permissionsForRole(Role.OWNER));
    for (const permission of adminPerms) {
      expect(ownerPerms.has(permission)).toBe(true);
    }
  });

  it('every role\'s permission set is a superset of the role below it (monotonic inheritance)', () => {
    const viewer = new Set(permissionsForRole(Role.VIEWER));
    const admin = new Set(permissionsForRole(Role.ADMIN));
    const owner = new Set(permissionsForRole(Role.OWNER));

    for (const p of viewer) expect(admin.has(p)).toBe(true);
    for (const p of admin) expect(owner.has(p)).toBe(true);
  });
});
