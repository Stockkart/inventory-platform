/// <reference types='vitest' />
import { defineConfig } from 'vite';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/plugins/cafe',
  test: {
    name: '@inventory-platform/plugin-cafe',
    watch: false,
    globals: false,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    reporters: ['default'],
  },
});
