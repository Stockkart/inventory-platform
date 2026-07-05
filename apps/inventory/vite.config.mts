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
      '@inventory-platform/session/api': path.resolve(
        __dirname,
        '../../platform/session/src/api/index.ts'
      ),
      '@inventory-platform/shell/api': path.resolve(
        __dirname,
        '../../platform/shell/src/api/index.ts'
      ),
      '@inventory-platform/user/shops': path.resolve(
        __dirname,
        '../../core/user/src/api/shops.api.ts'
      ),
      '@inventory-platform/user/users': path.resolve(
        __dirname,
        '../../core/user/src/api/user-lookup.api.ts'
      ),
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
      '@inventory-platform/contracts': path.resolve(
        __dirname,
        '../../platform/contracts/src/index.ts'
      ),
      '@inventory-platform/access': path.resolve(
        __dirname,
        '../../platform/access/src/index.ts'
      ),
      '@inventory-platform/session/types': path.resolve(
        __dirname,
        '../../platform/session/src/model/index.ts'
      ),
      '@inventory-platform/schema/types': path.resolve(
        __dirname,
        '../../platform/schema/src/types/index.ts'
      ),
      '@inventory-platform/shell/types': path.resolve(
        __dirname,
        '../../platform/shell/src/model/index.ts'
      ),
      '@inventory-platform/plan/types': path.resolve(
        __dirname,
        '../../core/plan/src/model/index.ts'
      ),
      '@inventory-platform/product/types': path.resolve(
        __dirname,
        '../../core/product/src/model/index.ts'
      ),
      '@inventory-platform/user/types': path.resolve(
        __dirname,
        '../../core/user/src/model/index.ts'
      ),
      '@inventory-platform/accounting/types': path.resolve(
        __dirname,
        '../../core/accounting/src/model/index.ts'
      ),
      '@inventory-platform/analytics/types': path.resolve(
        __dirname,
        '../../core/analytics/src/model/index.ts'
      ),
      '@inventory-platform/credit/types': path.resolve(
        __dirname,
        '../../core/credit/src/model/index.ts'
      ),
      '@inventory-platform/taxation/types': path.resolve(
        __dirname,
        '../../core/taxation/src/model/index.ts'
      ),
      '@inventory-platform/reminders/types': path.resolve(
        __dirname,
        '../../core/reminders/src/model/index.ts'
      ),
      '@inventory-platform/pricing/types': path.resolve(
        __dirname,
        '../../core/pricing/src/model/index.ts'
      ),
      '@inventory-platform/plugin-cafe/types': path.resolve(
        __dirname,
        '../../plugins/cafe/src/types/index.ts'
      ),
      '@inventory-platform/plan/payment': path.resolve(
        __dirname,
        '../../core/plan/src/payment/index.ts'
      ),
      '@inventory-platform/accounting/nav': path.resolve(
        __dirname,
        '../../core/accounting/src/nav.ts'
      ),
      '@inventory-platform/analytics/nav': path.resolve(
        __dirname,
        '../../core/analytics/src/nav.ts'
      ),
      '@inventory-platform/credit/nav': path.resolve(__dirname, '../../core/credit/src/nav.ts'),
      '@inventory-platform/plan/nav': path.resolve(__dirname, '../../core/plan/src/nav.ts'),
      '@inventory-platform/pricing/nav': path.resolve(
        __dirname,
        '../../core/pricing/src/nav.ts'
      ),
      '@inventory-platform/product/nav': path.resolve(
        __dirname,
        '../../core/product/src/nav.ts'
      ),
      '@inventory-platform/reminders/nav': path.resolve(
        __dirname,
        '../../core/reminders/src/nav.ts'
      ),
      '@inventory-platform/taxation/nav': path.resolve(
        __dirname,
        '../../core/taxation/src/nav.ts'
      ),
      '@inventory-platform/user/nav': path.resolve(__dirname, '../../core/user/src/nav.ts'),
      '@inventory-platform/user/journey/auth': path.resolve(
        __dirname,
        '../../core/user/src/journey/auth/index.ts'
      ),
      '@inventory-platform/user/journey/onboarding': path.resolve(
        __dirname,
        '../../core/user/src/journey/onboarding/index.ts'
      ),
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
