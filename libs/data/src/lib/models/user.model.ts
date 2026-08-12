import { Role } from '../enums/role.enum';

/** Safe-to-return shape — never includes passwordHash. */
export interface User {
  id: string;
  email: string;
  role: Role;
  organizationId: string;
}

/** The JWT payload, and the shape attached to `req.user` after auth. */
export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
  organizationId: string;
}
