/**
 * Framework-free entry point: role rank/inheritance, role→permission
 * mapping, and org-scope resolution — no NestJS import anywhere in this
 * file's graph. Import this (not '@app/auth') from apps/dashboard, so the
 * browser bundle never has a reason to touch @nestjs/common/@nestjs/core.
 * apps/api can use either; it uses '@app/auth' for the decorators/guards too.
 */
export * from './lib/role-hierarchy';
export * from './lib/role-permissions';
export * from './lib/org-scope';
