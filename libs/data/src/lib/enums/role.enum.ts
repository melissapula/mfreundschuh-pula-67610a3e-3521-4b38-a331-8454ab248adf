/**
 * Roles, listed low-to-high privilege. libs/auth's rank map assigns numeric
 * rank in this same order to implement inheritance (Owner > Admin > Viewer).
 */
export enum Role {
    VIEWER = 'VIEWER',
    ADMIN = 'ADMIN',
    OWNER = 'OWNER',
}
