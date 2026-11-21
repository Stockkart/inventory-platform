/// <reference types='vitest' />
import { defineConfig } from 'vitest/config';

// Store tests only (e.g. `src/lib/useToastStore.test.ts`); copied from platform/shell.
export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/platform/session',
  test: {
    name: 'session',
    environment: 'node',
    passWithNoTests: true,
    include: ['src/**/*.test.ts'],
  },
});
