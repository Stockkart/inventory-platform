/// <reference types='vitest' />
import { defineConfig, type PluginOption } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import netlifyReactRouter from '@netlify/vite-plugin-react-router';
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
    ...(process.env.VITE_ALLOWED_HOSTS
      ? {
          allowedHosts: process.env.VITE_ALLOWED_HOSTS.split(',')
            .map((h) => h.trim())
            .filter(Boolean),
        }
      : {}),
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  // netlifyReactRouter() packages the SSR server as a Netlify Function at build
  // time. It only writes extra output under .netlify/, so local dev and the
  // react-router-serve / Docker path are unaffected.
  plugins: (!process.env.VITEST ? [reactRouter(), netlifyReactRouter()] : []) as PluginOption[],
  resolve: {
    // Prefer one React copy across workspace packages (do not hard-alias —
    // that bypasses package exports and breaks SSR with "module is not defined").
    dedupe: ['react', 'react-dom'],
    alias: generateInventoryWorkspaceAliases({ workspaceRoot, appDir }),
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  ssr: {
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
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
