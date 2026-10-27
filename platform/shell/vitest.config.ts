/// <reference types='vitest' />
import { defineConfig } from 'vitest/config';

// Pure-logic tests only (e.g. `src/lib/accessNav.test.ts`); copied from platform/api-client.
export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/platform/shell',
  test: {
    name: 'shell',
    environment: 'node',
    passWithNoTests: true,
    include: ['src/**/*.test.ts'],
  },
});
