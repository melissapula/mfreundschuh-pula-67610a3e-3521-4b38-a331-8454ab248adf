const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

// Separate bundle for the seed script — it's a standalone one-shot tool, not
// part of the served app, but building it through webpack (same as main.ts)
// resolves @app/data at build time so there's no path-alias runtime concern
// once deployed, unlike running it via plain ts-node.
module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/api-seed'),
    clean: true,
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/seed.ts',
      tsConfig: './tsconfig.app.json',
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      // dotenv is imported as 'dotenv/config' (a subpath import), which the
      // externals-detection heuristic doesn't resolve back to the package
      // name — same class of gap as better-sqlite3 above.
      runtimeDependencies: ['better-sqlite3', 'dotenv'],
      sourceMap: true,
    }),
  ],
};
