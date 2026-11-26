/// <reference types='vitest' />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// ui-kit imports nothing from the workspace, so no alias helper is needed (unlike core/*).
export default defineConfig({
  root: __dirname,
  cacheDir: '../node_modules/.vite/ui-kit',
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  test: {
    globals: true,
    passWithNoTests: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
