/// <reference types='vitest' />
import { defineConfig } from 'vite';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/plugins/cafe',
  // The package builds through tsc (jsx: react-jsx in tsconfig.lib.json); vitest transforms
  // its own files with esbuild, which defaults to the classic runtime and would need React
  // in scope of every component spec.
  esbuild: { jsx: 'automatic' },
  test: {
    name: '@inventory-platform/plugin-cafe',
    watch: false,
    globals: false,
    // Component specs opt into jsdom with a `@vitest-environment jsdom` docblock; the pure
    // logic modules that make up most of this package do not need a DOM.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    reporters: ['default'],
  },
});
