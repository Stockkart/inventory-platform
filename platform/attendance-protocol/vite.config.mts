/// <reference types='vitest' />
import { defineConfig } from 'vite';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/platform/attendance-protocol',
  test: {
    name: '@inventory-platform/attendance-protocol',
    watch: false,
    globals: false,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    reporters: ['default'],
  },
});
