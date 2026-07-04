/// <reference types='vitest' />
import { defineConfig, type PluginOption } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import * as path from 'node:path';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/inventory',
  server: {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  plugins: (!process.env.VITEST ? [reactRouter()] : []) as PluginOption[],
  resolve: {
    alias: {
      '@inventory-platform/ui': path.resolve(__dirname, '../../shared/ui/src/index.ts'),
      '@inventory-platform/store': path.resolve(__dirname, '../../shared/store/src/index.ts'),
      '@inventory-platform/api': path.resolve(__dirname, '../../shared/api/src/index.ts'),
      '@inventory-platform/types': path.resolve(__dirname, '../../shared/types/src/index.ts'),
      '@inventory-platform/payment': path.resolve(__dirname, '../../shared/payment/src/index.ts'),
      '@inventory-platform/dashboard': path.resolve(__dirname, '../../features/dashboard/src/index.ts'),
      '@inventory-platform/onboarding': path.resolve(__dirname, '../../features/onboarding/src/index.ts'),
      '@inventory-platform/auth': path.resolve(__dirname, '../../features/auth/src/index.ts'),
      '@inventory-platform/analytics': path.resolve(__dirname, '../../features/analytics/src/index.ts'),
    },
  },
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
