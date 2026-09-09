/// <reference types='vitest' />
import { defineConfig } from 'vite';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/core/product',
  test: {
    name: '@inventory-platform/product',
    watch: false,
    globals: false,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    reporters: ['default'],
  },
});
