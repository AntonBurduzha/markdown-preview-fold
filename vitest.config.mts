import { defineConfig } from 'vitest/config';

// Two projects for the two runtimes: the extension host (Node) and the preview (a browser page).
export default defineConfig({
  test: {
    projects: [
      { test: { name: 'node', include: ['test/node/**/*.test.ts'], environment: 'node' } },
      { test: { name: 'preview', include: ['test/preview/**/*.test.ts'], environment: 'jsdom' } },
    ],
  },
});
