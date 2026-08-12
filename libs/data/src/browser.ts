/**
 * Framework-free entry point for the browser: enums, wire-shape models, and
 * plain-interface request inputs — no class-validator anywhere in this
 * file's graph. apps/dashboard imports from here (not '@app/data'), so its
 * bundle never pulls in class-validator/validator. apps/api uses '@app/data'
 * (the main barrel) since it needs the actual decorated DTO classes for
 * ValidationPipe.
 */
export * from './lib/enums/role.enum';
export * from './lib/enums/permission.enum';
export * from './lib/enums/task.enum';
export * from './lib/enums/audit-action.enum';

export * from './lib/models/organization.model';
export * from './lib/models/user.model';
export * from './lib/models/task.model';
export * from './lib/models/audit-log.model';

export * from './lib/dto/task-input.types';
export * from './lib/dto/login-input.types';
