import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '@app/data/browser';
import { roleAtLeast } from '@app/auth/core';
import { AuthService } from './auth.service';

/**
 * UX-only gate (hides a route the user has no use for). The API is the real
 * authority — GET /audit-log enforces AUDIT_READ server-side regardless of
 * whether this guard runs.
 */
export const minRoleGuard = (minimum: Role): CanActivateFn => {
    return () => {
        const auth = inject(AuthService);
        const role = auth.role();
        if (role && roleAtLeast(role, minimum)) {
            return true;
        }
        return inject(Router).parseUrl('/dashboard');
    };
};
