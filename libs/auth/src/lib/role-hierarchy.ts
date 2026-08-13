import { Role } from '@app/data/browser';

/**
 * Numeric rank implements role inheritance: Owner > Admin > Viewer.
 * A higher rank always satisfies any check that a lower rank satisfies.
 */
const ROLE_RANK: Record<Role, number> = {
    [Role.VIEWER]: 1,
    [Role.ADMIN]: 2,
    [Role.OWNER]: 3,
};

export function roleRank(role: Role): number {
    return ROLE_RANK[role];
}

export function roleAtLeast(role: Role, required: Role): boolean {
    return roleRank(role) >= roleRank(required);
}
