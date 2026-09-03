/// <reference types='vitest' />
import { defineConfig } from 'vite';

export default defineConfig({
  cacheDir: '../node_modules/.vite/ui-kit',
  test: {
    name: '@inventory-platform/ui-kit',
    watch: false,
    globals: false,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    reporters: ['default'],
  },
});
