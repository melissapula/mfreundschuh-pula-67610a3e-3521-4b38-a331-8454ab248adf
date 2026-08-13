/**
 * Fine-grained capabilities. A role maps to a set of these (see
 * ROLE_PERMISSIONS in libs/auth) rather than endpoints checking role
 * names directly, so a new role only ever requires a mapping change.
 */
export enum Permission {
    TASK_CREATE = 'TASK_CREATE',
    TASK_READ = 'TASK_READ',
    TASK_UPDATE = 'TASK_UPDATE',
    TASK_DELETE = 'TASK_DELETE',
    AUDIT_READ = 'AUDIT_READ',
}
