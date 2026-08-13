import { Route } from '@angular/router';
import { Role } from '@app/data/browser';
import { authGuard } from './core/auth/auth.guard';
import { minRoleGuard } from './core/auth/role.guard';

export const appRoutes: Route[] = [
    { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    {
        path: 'login',
        loadComponent: () =>
            import('./features/login/login.component').then(
                (m) => m.LoginComponent,
            ),
    },
    {
        path: 'dashboard',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./features/dashboard/dashboard.component').then(
                (m) => m.DashboardComponent,
            ),
    },
    {
        path: 'audit-log',
        canActivate: [authGuard, minRoleGuard(Role.ADMIN)],
        loadComponent: () =>
            import('./features/audit-log/audit-log.component').then(
                (m) => m.AuditLogComponent,
            ),
    },
    { path: '**', redirectTo: 'dashboard' },
];
