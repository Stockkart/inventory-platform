/// <reference types='vitest' />
import { defineConfig, type PluginOption } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import * as path from 'node:path';
import { generateInventoryWorkspaceAliases } from '../../platform/routing/vite-aliases.mts';

const workspaceRoot = path.resolve(__dirname, '../..');
const appDir = __dirname;

export default defineConfig({
  root: appDir,
  cacheDir: '../../node_modules/.vite/apps/admin',
  // Shares the StockKart logo and other static assets with the shop app.
  publicDir: '../inventory/public',
  server: {
    port: 4400,
    host: 'localhost',
  },
  preview: {
    port: 4500,
    host: 'localhost',
  },
  plugins: (!process.env.VITEST ? [reactRouter()] : []) as PluginOption[],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: generateInventoryWorkspaceAliases({ workspaceRoot, appDir }),
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
