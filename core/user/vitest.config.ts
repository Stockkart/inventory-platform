/// <reference types='vitest' />
import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import * as path from 'node:path';
import { generateInventoryWorkspaceAliases } from '../../platform/routing/vite-aliases.mts';

const workspaceRoot = path.resolve(__dirname, '../..');
const appDir = __dirname;

const TEST_FILES = ['src/**/*.test.{ts,tsx}'];
const UI_DIR = 'src/ui/**';

export default defineConfig({
  root: appDir,
  cacheDir: '../../node_modules/.vite/core/user',
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: generateInventoryWorkspaceAliases({ workspaceRoot, appDir }),
  },
  test: {
    globals: true,
    passWithNoTests: true,
    setupFiles: ['./vitest.setup.ts'],
    // Vitest 4 dropped `environmentMatchGlobs`; split environments via projects instead.
    // Pure logic under src/lib, src/model, src/api, ... runs in node; React UI runs in jsdom.
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: TEST_FILES,
          exclude: [...configDefaults.exclude, UI_DIR],
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: [`${UI_DIR}/*.test.{ts,tsx}`],
        },
      },
    ],
  },
});
