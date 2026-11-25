import { defineConfig } from '@vscode/test-cli';

// Runs the Mocha suites in out/integration inside a real VS Code.
// VSCODE_TEST_VERSION picks the version: 'stable' by default, the minimum one in CI.
export default defineConfig({
  label: 'integration',
  files: 'out/integration/**/*.test.js',
  version: process.env.VSCODE_TEST_VERSION ?? 'stable',
  workspaceFolder: './test/fixtures',
  launchArgs: ['--disable-extensions'],
  mocha: { ui: 'tdd', timeout: 20_000 },
});
