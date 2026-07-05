import * as fs from 'node:fs';
import * as path from 'node:path';

type RouteAliasPackage = {
  aliasPrefix: string;
  routesDir: string;
};

type WorkspaceAliasConfig = {
  workspaceRoot: string;
  appDir: string;
};

const DOMAIN_PACKAGES = [
  'accounting',
  'analytics',
  'credit',
  'plan',
  'pricing',
  'product',
  'reminders',
  'taxation',
  'user',
] as const;

function generateRouteFileAliases(routesDir: string, aliasPrefix: string): Record<string, string> {
  if (!fs.existsSync(routesDir)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readdirSync(routesDir)
      .filter((file) => file.endsWith('.tsx'))
      .map((file) => [
        `${aliasPrefix}/${file.replace(/\.tsx$/, '')}`,
        path.join(routesDir, file),
      ])
  );
}

function routeAliasPackages(workspaceRoot: string): RouteAliasPackage[] {
  return [
    ...DOMAIN_PACKAGES.map((domain) => ({
      aliasPrefix: `@inventory-platform/${domain}/routes`,
      routesDir: path.join(workspaceRoot, 'core', domain, 'src', 'routes'),
    })),
    {
      aliasPrefix: '@inventory-platform/plugin-cafe/routes',
      routesDir: path.join(workspaceRoot, 'plugins', 'cafe', 'src', 'routes'),
    },
    {
      aliasPrefix: '@inventory-platform/shell/routes',
      routesDir: path.join(workspaceRoot, 'platform', 'shell', 'src', 'routes'),
    },
  ];
}

/** Generate Vite resolve aliases for monorepo packages used by the inventory app. */
export function generateInventoryWorkspaceAliases({
  workspaceRoot,
  appDir,
}: WorkspaceAliasConfig): Record<string, string> {
  const core = (domain: string, ...segments: string[]) =>
    path.resolve(workspaceRoot, 'core', domain, ...segments);
  const platform = (...segments: string[]) =>
    path.resolve(workspaceRoot, 'platform', ...segments);
  const plugins = (...segments: string[]) =>
    path.resolve(workspaceRoot, 'plugins', ...segments);

  const routeAliases = Object.assign(
    {},
    ...routeAliasPackages(workspaceRoot).map(({ aliasPrefix, routesDir }) =>
      generateRouteFileAliases(routesDir, aliasPrefix)
    )
  );

  return {
    ...routeAliases,
    '@inventory-platform/ui-kit/form-styles': path.resolve(
      workspaceRoot,
      'ui-kit/src/form-styles.ts'
    ),
    '@inventory-platform/ui-kit': path.resolve(workspaceRoot, 'ui-kit/src/index.ts'),
    '@inventory-platform/session/api': platform('session/src/api/index.ts'),
    '@inventory-platform/shell/api': platform('shell/src/api/index.ts'),
    '@inventory-platform/user/shops': core('user', 'src/api/shops.api.ts'),
    '@inventory-platform/user/users': core('user', 'src/api/user-lookup.api.ts'),
    '@inventory-platform/user/customers': core('user', 'src/api/customers.api.ts'),
    '@inventory-platform/user/vendors': core('user', 'src/api/vendors.api.ts'),
    '@inventory-platform/user/shop-access': core('user', 'src/api/shop-access.api.ts'),
    '@inventory-platform/user/invitations': core('user', 'src/api/invitations.api.ts'),
    '@inventory-platform/contracts': platform('contracts/src/index.ts'),
    '@inventory-platform/access': platform('access/src/index.ts'),
    '@inventory-platform/session/types': platform('session/src/model/index.ts'),
    '@inventory-platform/schema/types': platform('schema/src/types/index.ts'),
    '@inventory-platform/shell/types': platform('shell/src/model/index.ts'),
    '@inventory-platform/plan/types': core('plan', 'src/model/index.ts'),
    '@inventory-platform/product/types': core('product', 'src/model/index.ts'),
    '@inventory-platform/user/types': core('user', 'src/model/index.ts'),
    '@inventory-platform/accounting/types': core('accounting', 'src/model/index.ts'),
    '@inventory-platform/analytics/types': core('analytics', 'src/model/index.ts'),
    '@inventory-platform/credit/types': core('credit', 'src/model/index.ts'),
    '@inventory-platform/taxation/types': core('taxation', 'src/model/index.ts'),
    '@inventory-platform/reminders/types': core('reminders', 'src/model/index.ts'),
    '@inventory-platform/pricing/types': core('pricing', 'src/model/index.ts'),
    '@inventory-platform/plugin-cafe/types': plugins('cafe/src/types/index.ts'),
    '@inventory-platform/plan/payment': core('plan', 'src/payment/index.ts'),
    '@inventory-platform/accounting/nav': core('accounting', 'src/nav.ts'),
    '@inventory-platform/analytics/nav': core('analytics', 'src/nav.ts'),
    '@inventory-platform/credit/nav': core('credit', 'src/nav.ts'),
    '@inventory-platform/plan/nav': core('plan', 'src/nav.ts'),
    '@inventory-platform/pricing/nav': core('pricing', 'src/nav.ts'),
    '@inventory-platform/product/nav': core('product', 'src/nav.ts'),
    '@inventory-platform/reminders/nav': core('reminders', 'src/nav.ts'),
    '@inventory-platform/taxation/nav': core('taxation', 'src/nav.ts'),
    '@inventory-platform/user/nav': core('user', 'src/nav.ts'),
    '@inventory-platform/user/journey/auth': core('user', 'src/journey/auth/index.ts'),
    '@inventory-platform/user/journey/onboarding': core(
      'user',
      'src/journey/onboarding/index.ts'
    ),
    '@inventory-platform/analytics': core('analytics', 'src/index.ts'),
    '@inventory-platform/accounting': core('accounting', 'src/index.ts'),
    '@inventory-platform/credit': core('credit', 'src/index.ts'),
    '@inventory-platform/taxation': core('taxation', 'src/index.ts'),
    '@inventory-platform/reminders': core('reminders', 'src/index.ts'),
    '@inventory-platform/plan/marketing': core('plan', 'src/marketing/index.ts'),
    '@inventory-platform/plan/api': core('plan', 'src/api/index.ts'),
    '@inventory-platform/plan': core('plan', 'src/index.ts'),
    '@inventory-platform/user': core('user', 'src/index.ts'),
    '@inventory-platform/pricing/api': core('pricing', 'src/api/index.ts'),
    '@inventory-platform/pricing': core('pricing', 'src/index.ts'),
    '@inventory-platform/product/api': core('product', 'src/api/index.ts'),
    '@inventory-platform/product/pages/product-search.module.css': core(
      'product',
      'src/pages/product-search.module.css'
    ),
    '@inventory-platform/product/pages/scan-sell.module.css': core(
      'product',
      'src/pages/scan-sell.module.css'
    ),
    '@inventory-platform/product': core('product', 'src/index.ts'),
    '@inventory-platform/plugin-registry/routes': plugins('registry/src/routes/index.ts'),
    '@inventory-platform/plugin-registry': plugins('registry/src/index.ts'),
    '@inventory-platform/plugin-cafe': plugins('cafe/src/index.ts'),
    '@inventory-platform/query': platform('query/src/index.ts'),
    '@inventory-platform/session': platform('session/src/index.ts'),
    '@inventory-platform/api-client': platform('api-client/src/index.ts'),
    '@inventory-platform/routing': platform('routing/src/index.ts'),
    '@inventory-platform/shell/guards': platform('shell/src/guards/index.ts'),
    '@inventory-platform/shell': platform('shell/src/index.ts'),
    '@inventory-platform/schema': platform('schema/src/index.ts'),
  };
}

export { generateRouteFileAliases, routeAliasPackages };
