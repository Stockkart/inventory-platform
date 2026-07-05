/// <reference types='vitest' />
import { defineConfig, type PluginOption } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import * as fs from 'node:fs';
import * as path from 'node:path';

const accountingRoutesDir = path.resolve(
  __dirname,
  '../../core/accounting/src/routes'
);
const accountingRouteAliases = Object.fromEntries(
  fs
    .readdirSync(accountingRoutesDir)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => [
      `@inventory-platform/accounting/routes/${file.replace(/\.tsx$/, '')}`,
      path.join(accountingRoutesDir, file),
    ])
);

const creditRoutesDir = path.resolve(__dirname, '../../core/credit/src/routes');
const creditRouteAliases = Object.fromEntries(
  fs
    .readdirSync(creditRoutesDir)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => [
      `@inventory-platform/credit/routes/${file.replace(/\.tsx$/, '')}`,
      path.join(creditRoutesDir, file),
    ])
);

const taxationRoutesDir = path.resolve(__dirname, '../../core/taxation/src/routes');
const taxationRouteAliases = Object.fromEntries(
  fs
    .readdirSync(taxationRoutesDir)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => [
      `@inventory-platform/taxation/routes/${file.replace(/\.tsx$/, '')}`,
      path.join(taxationRoutesDir, file),
    ])
);

const analyticsRoutesDir = path.resolve(__dirname, '../../core/analytics/src/routes');
const analyticsRouteAliases = Object.fromEntries(
  fs
    .readdirSync(analyticsRoutesDir)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => [
      `@inventory-platform/analytics/routes/${file.replace(/\.tsx$/, '')}`,
      path.join(analyticsRoutesDir, file),
    ])
);

const remindersRoutesDir = path.resolve(__dirname, '../../core/reminders/src/routes');
const remindersRouteAliases = Object.fromEntries(
  fs
    .readdirSync(remindersRoutesDir)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => [
      `@inventory-platform/reminders/routes/${file.replace(/\.tsx$/, '')}`,
      path.join(remindersRoutesDir, file),
    ])
);

const planRoutesDir = path.resolve(__dirname, '../../core/plan/src/routes');
const planRouteAliases = Object.fromEntries(
  fs
    .readdirSync(planRoutesDir)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => [
      `@inventory-platform/plan/routes/${file.replace(/\.tsx$/, '')}`,
      path.join(planRoutesDir, file),
    ])
);

const userRoutesDir = path.resolve(__dirname, '../../core/user/src/routes');
const userRouteAliases = Object.fromEntries(
  fs
    .readdirSync(userRoutesDir)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => [
      `@inventory-platform/user/routes/${file.replace(/\.tsx$/, '')}`,
      path.join(userRoutesDir, file),
    ])
);

const pricingRoutesDir = path.resolve(__dirname, '../../core/pricing/src/routes');
const pricingRouteAliases = Object.fromEntries(
  fs
    .readdirSync(pricingRoutesDir)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => [
      `@inventory-platform/pricing/routes/${file.replace(/\.tsx$/, '')}`,
      path.join(pricingRoutesDir, file),
    ])
);

const productRoutesDir = path.resolve(__dirname, '../../core/product/src/routes');
const productRouteAliases = Object.fromEntries(
  fs
    .readdirSync(productRoutesDir)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => [
      `@inventory-platform/product/routes/${file.replace(/\.tsx$/, '')}`,
      path.join(productRoutesDir, file),
    ])
);

const cafeRoutesDir = path.resolve(__dirname, '../../plugins/cafe/src/routes');
const cafeRouteAliases = Object.fromEntries(
  fs
    .readdirSync(cafeRoutesDir)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => [
      `@inventory-platform/plugin-cafe/routes/${file.replace(/\.tsx$/, '')}`,
      path.join(cafeRoutesDir, file),
    ])
);

const shellRoutesDir = path.resolve(__dirname, '../../platform/shell/src/routes');
const shellRouteAliases = Object.fromEntries(
  fs
    .readdirSync(shellRoutesDir)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => [
      `@inventory-platform/shell/routes/${file.replace(/\.tsx$/, '')}`,
      path.join(shellRoutesDir, file),
    ])
);

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
      ...accountingRouteAliases,
      ...creditRouteAliases,
      ...taxationRouteAliases,
      ...analyticsRouteAliases,
      ...remindersRouteAliases,
      ...planRouteAliases,
      ...userRouteAliases,
      ...pricingRouteAliases,
      ...productRouteAliases,
      ...cafeRouteAliases,
      ...shellRouteAliases,
      '@inventory-platform/ui-kit/form-styles': path.resolve(
        __dirname,
        '../../ui-kit/src/form-styles.ts'
      ),
      '@inventory-platform/ui-kit': path.resolve(__dirname, '../../ui-kit/src/index.ts'),
      '@inventory-platform/store': path.resolve(__dirname, '../../shared/store/src/index.ts'),
      '@inventory-platform/user/customers': path.resolve(
        __dirname,
        '../../core/user/src/api/customers.api.ts'
      ),
      '@inventory-platform/user/vendors': path.resolve(
        __dirname,
        '../../core/user/src/api/vendors.api.ts'
      ),
      '@inventory-platform/user/shop-access': path.resolve(
        __dirname,
        '../../core/user/src/api/shop-access.api.ts'
      ),
      '@inventory-platform/user/invitations': path.resolve(
        __dirname,
        '../../core/user/src/api/invitations.api.ts'
      ),
      '@inventory-platform/api': path.resolve(__dirname, '../../shared/api/src/index.ts'),
      '@inventory-platform/types': path.resolve(__dirname, '../../shared/types/src/index.ts'),
      '@inventory-platform/payment': path.resolve(__dirname, '../../shared/payment/src/index.ts'),
      '@inventory-platform/onboarding': path.resolve(__dirname, '../../features/onboarding/src/index.ts'),
      '@inventory-platform/auth': path.resolve(__dirname, '../../features/auth/src/index.ts'),
      '@inventory-platform/analytics': path.resolve(__dirname, '../../core/analytics/src/index.ts'),
      '@inventory-platform/accounting': path.resolve(__dirname, '../../core/accounting/src/index.ts'),
      '@inventory-platform/credit': path.resolve(__dirname, '../../core/credit/src/index.ts'),
      '@inventory-platform/taxation': path.resolve(__dirname, '../../core/taxation/src/index.ts'),
      '@inventory-platform/reminders': path.resolve(__dirname, '../../core/reminders/src/index.ts'),
      '@inventory-platform/plan/api': path.resolve(__dirname, '../../core/plan/src/api/index.ts'),
      '@inventory-platform/plan': path.resolve(__dirname, '../../core/plan/src/index.ts'),
      '@inventory-platform/user': path.resolve(__dirname, '../../core/user/src/index.ts'),
      '@inventory-platform/pricing/api': path.resolve(__dirname, '../../core/pricing/src/api/index.ts'),
      '@inventory-platform/pricing': path.resolve(__dirname, '../../core/pricing/src/index.ts'),
      '@inventory-platform/product/api': path.resolve(__dirname, '../../core/product/src/api/index.ts'),
      '@inventory-platform/product/pages/product-search.module.css': path.resolve(
        __dirname,
        '../../core/product/src/pages/product-search.module.css'
      ),
      '@inventory-platform/product/pages/scan-sell.module.css': path.resolve(
        __dirname,
        '../../core/product/src/pages/scan-sell.module.css'
      ),
      '@inventory-platform/product': path.resolve(__dirname, '../../core/product/src/index.ts'),
      '@inventory-platform/plugin-registry': path.resolve(
        __dirname,
        '../../plugins/registry/src/index.ts'
      ),
      '@inventory-platform/plugin-cafe': path.resolve(
        __dirname,
        '../../plugins/cafe/src/index.ts'
      ),
      '@inventory-platform/query': path.resolve(__dirname, '../../platform/query/src/index.ts'),
      '@inventory-platform/session': path.resolve(__dirname, '../../platform/session/src/index.ts'),
      '@inventory-platform/api-client': path.resolve(__dirname, '../../platform/api-client/src/index.ts'),
      '@inventory-platform/routing': path.resolve(__dirname, '../../platform/routing/src/index.ts'),
      '@inventory-platform/shell': path.resolve(__dirname, '../../platform/shell/src/index.ts'),
      '@inventory-platform/schema': path.resolve(__dirname, '../../platform/schema/src/index.ts'),
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
