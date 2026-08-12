/**
 * Import this first (before anything that resolves @app/*) in standalone
 * scripts run via plain ts-node, e.g. seed.ts. The real apps/dashboard
 * builds resolve @app/* fine via webpack/Angular's tooling and tsc itself
 * (both understand tsconfig.base.json's path-mapping directly) — this
 * file exists only because the third-party `tsconfig-paths` package
 * mis-resolves relative "paths" entries against the leaf tsconfig's
 * directory instead of the workspace root when no "baseUrl" is set, which
 * matters only for this kind of standalone, non-bundled execution.
 */
import { join } from 'path';
import { register } from 'tsconfig-paths';

register({
  baseUrl: join(__dirname, '../../..'),
  paths: {
    '@app/data': ['libs/data/src/index.ts'],
    '@app/auth': ['libs/auth/src/index.ts'],
  },
});
