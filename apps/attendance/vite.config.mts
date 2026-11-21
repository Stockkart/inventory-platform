/// <reference types='vitest' />
import * as path from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';

/**
 * Test-only Vite config (no `build`: the app is built by Expo / EAS, not Vite). Nx infers the
 * `test` target from this file.
 *
 * Two projects: pure logic under `src/**` runs in node; screens under `src/screens/**` run in
 * jsdom with `react-native` aliased to `test-support/react-native-dom.tsx` (plain DOM elements),
 * so `@testing-library/react` can render and tap them. Modules that touch Expo APIs are mocked in
 * their tests.
 */
const SCREENS = 'src/screens/**';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/apps/attendance',
  esbuild: { jsx: 'automatic' },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'react-native': path.resolve(__dirname, 'test-support/react-native-dom.tsx'),
    },
  },
  test: {
    name: '@inventory-platform/attendance',
    watch: false,
    globals: false,
    reporters: ['default'],
    env: {
      // `src/config.ts` throws on import without an https:// URL. Tests of that rule override
      // this value with `vi.stubEnv`.
      EXPO_PUBLIC_API_URL: 'https://api.test.invalid/api/v1',
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: [...configDefaults.exclude, SCREENS],
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: [`${SCREENS}/*.{test,spec}.{ts,tsx}`],
        },
      },
    ],
  },
});
