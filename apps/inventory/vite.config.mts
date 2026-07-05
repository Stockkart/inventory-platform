/// <reference types='vitest' />
import { defineConfig, type PluginOption } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import * as path from 'node:path';
import { generateInventoryWorkspaceAliases } from '../../platform/routing/vite-aliases.mts';

const workspaceRoot = path.resolve(__dirname, '../..');
const appDir = __dirname;

export default defineConfig({
  root: appDir,
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
    alias: generateInventoryWorkspaceAliases({ workspaceRoot, appDir }),
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
