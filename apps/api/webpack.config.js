const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
    output: {
        path: join(__dirname, '../../dist/apps/api'),
        clean: true,
        ...(process.env.NODE_ENV !== 'production' && {
            devtoolModuleFilenameTemplate: '[absolute-resource-path]',
        }),
    },
    plugins: [
        new NxAppWebpackPlugin({
            target: 'node',
            compiler: 'tsc',
            main: './src/main.ts',
            tsConfig: './tsconfig.app.json',
            assets: ['./src/assets'],
            optimization: false,
            outputHashing: 'none',
            generatePackageJson: true,
            // better-sqlite3 is loaded by TypeORM via a dynamic require() keyed off
            // the `type: 'better-sqlite3'` config string, which webpack's static
            // analysis can't see — without this, the generated package.json omits
            // it and `npm ci` in the Docker image would never install it. dotenv
            // isn't actually used by main.ts (that's api:build-seed's doing), but
            // listing it here too means the Docker image's seed.js can share this
            // same package.json/node_modules instead of needing its own npm ci.
            runtimeDependencies: ['better-sqlite3', 'dotenv'],
            sourceMap: true,
        }),
    ],
};
