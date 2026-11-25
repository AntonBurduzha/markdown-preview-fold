// @ts-check
// Builds the two bundles: the extension (Node, extension host) and the preview script (browser).
// Flags: --watch, --production (minified, no source maps), --tests (also builds integration tests).
// Dev builds: the extension gets a separate .map; the preview gets an inline map with its sources,
// because the preview's CSP blocks DevTools from fetching a .map file.
import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const production = process.argv.includes('--production');
const tests = process.argv.includes('--tests');

/** Prints build markers and errors in the format the problem matcher in .vscode/tasks.json reads. */
/** @type {esbuild.Plugin} */
const watchLogger = {
  name: 'watch-logger',
  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd((result) => {
      for (const { text, location } of result.errors) {
        console.error(`✘ [ERROR] ${text}`);
        if (location) console.error(`    ${location.file}:${location.line}:${location.column}:`);
      }
      console.log('[watch] build finished');
    });
  },
};

/** @type {esbuild.BuildOptions} */
const common = {
  bundle: true,
  minify: production,
  sourcemap: !production,
  sourcesContent: false,
  // In watch mode the plugin reports; otherwise esbuild prints warnings and errors itself.
  logLevel: watch ? 'silent' : 'warning',
  plugins: watch ? [watchLogger] : [],
};

/** @type {esbuild.BuildOptions[]} */
const builds = [
  {
    ...common,
    entryPoints: ['src/extension.ts'],
    outfile: 'dist/extension.js',
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['vscode'],
  },
  {
    ...common,
    entryPoints: ['src/preview/index.ts'],
    outfile: 'dist/preview.js',
    platform: 'browser',
    format: 'iife',
    target: 'es2022',
    // The preview CSP (`default-src 'none'`) blocks fetching a separate .map file or the .ts sources,
    // so both go inline. Without the sources, DevTools would try to fetch src/preview/*.ts and fail too.
    sourcemap: production ? false : 'inline',
    sourcesContent: true,
  },
];

if (tests) {
  builds.push({
    ...common,
    entryPoints: ['test/integration/**/*.test.ts'],
    outdir: 'out/integration',
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['vscode', 'mocha'],
  });
}

if (watch) {
  for (const options of builds) {
    const context = await esbuild.context(options);
    await context.watch();
  }
} else {
  const results = await Promise.allSettled(builds.map((options) => esbuild.build(options)));
  if (results.some((result) => result.status === 'rejected')) process.exit(1);
}
