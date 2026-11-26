/// <reference types='vitest' />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import * as path from 'node:path';
import { generateInventoryWorkspaceAliases } from '../routing/vite-aliases.mts';

const workspaceRoot = path.resolve(__dirname, '../..');
const appDir = __dirname;

// Pure-logic tests (`src/**/*.test.ts`, e.g. `src/lib/accessNav.test.ts`) run in node; the few
// React tests (`src/**/*.test.tsx`, e.g. the route guard and `NotInShopPage`) run in jsdom.
export default defineConfig({
  root: appDir,
  cacheDir: '../../node_modules/.vite/platform/shell',
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: generateInventoryWorkspaceAliases({ workspaceRoot, appDir }),
  },
  test: {
    name: 'shell',
    globals: true,
    passWithNoTests: true,
    setupFiles: ['./vitest.setup.ts'],
    projects: [
      {
        extends: true,
        test: {
          name: 'shell-node',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'shell-jsdom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
        },
      },
    ],
  },
});
