import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('./routes/_index.tsx'),
  route('favicon.ico', './routes/favicon.tsx'),
  route(
    '.well-known/appspecific/com.chrome.devtools.json',
    './routes/well-known-chrome-devtools.tsx'
  ),
  route('login', './routes/login.tsx'),
  route('signup', './routes/signup.tsx'),
  route('forgot-password', './routes/forgot-password.tsx'),
  route('reset-password', './routes/reset-password.tsx'),
  route('plans', './routes/plans.tsx'),
  route('shop-selection', './routes/shop-selection.tsx'),
  route('request-join-shop', './routes/request-join-shop.tsx'),
  route('my-requests-invitations', './routes/my-requests-invitations.tsx'),
  route('onboarding', './routes/onboarding.tsx'),
  route('m/upload', './routes/m.upload.tsx'),
  route('dashboard', './routes/dashboard._layout.tsx', [
    route('', '../../../platform/shell/src/routes/overview.tsx'),
    route('shops', '../../../core/user/src/routes/shops.tsx'),
    route('profile', '../../../core/user/src/routes/profile.tsx'),
    route('customers', '../../../core/user/src/routes/customers.tsx'),
    route('vendors', '../../../core/user/src/routes/vendors.tsx'),
    route(
      'product-registration',
      '../../../core/product/src/routes/product-registration.tsx'
    ),
    route('import', '../../../core/product/src/routes/import.tsx'),
    route('product-search', '../../../core/product/src/routes/product-search.tsx'),
    route('pricing', '../../../core/pricing/src/routes/pricing.tsx'),
    route('scan-sell', '../../../core/product/src/routes/scan-sell.tsx'),
    route('menu-sell', '../../../plugins/cafe/src/routes/menu-sell.tsx'),
    route('menu', '../../../plugins/cafe/src/routes/menu.tsx'),
    route('manual-stock', '../../../plugins/cafe/src/routes/manual-stock.tsx'),
    route('checkout', '../../../core/product/src/routes/checkout.tsx'),
    route('payment-billing', '../../../core/plan/src/routes/payment-billing.tsx'),
    route('analytics', '../../../core/analytics/src/routes/index.tsx'),
    route('inventory-alert', '../../../core/reminders/src/routes/inventory-alert.tsx'),
    route('reminders', '../../../core/reminders/src/routes/index.tsx'),
    route('invitations', '../../../core/user/src/routes/invitations.tsx'),
    route('my-invitations', '../../../core/user/src/routes/my-invitations.tsx'),
    route('shop-users', '../../../core/user/src/routes/shop-users.tsx'),
    route('access-control', '../../../core/user/src/routes/access-control.tsx'),
    route('join-requests', '../../../core/user/src/routes/join-requests.tsx'),
    route('history', '../../../core/product/src/routes/history.tsx'),
    route('vendor-invoices', '../../../core/product/src/routes/vendor-invoices.tsx'),
    route('stock-corrections', '../../../core/product/src/routes/stock-corrections.tsx'),
    route('vendor-return', '../../../core/product/src/routes/vendor-return.tsx'),
    route('refund', '../../../core/product/src/routes/refund.tsx'),
    route('price-edit/:pricingId', '../../../core/pricing/src/routes/price-edit.tsx'),
    route('taxes', '../../../core/taxation/src/routes/index.tsx'),
    route('credit', '../../../core/credit/src/routes/index.tsx'),
    route('accounting', '../../../core/accounting/src/routes/overview.tsx'),
    route('accounting/journal', '../../../core/accounting/src/routes/journal.tsx'),
    route(
      'accounting/journal/new',
      '../../../core/accounting/src/routes/journal-new.tsx'
    ),
    route(
      'accounting/journal/:entryId',
      '../../../core/accounting/src/routes/journal-detail.tsx'
    ),
    route('accounting/ledger', '../../../core/accounting/src/routes/ledger.tsx'),
    route(
      'accounting/ledger/:accountId',
      '../../../core/accounting/src/routes/ledger-account.tsx'
    ),
    route('accounting/vendors', '../../../core/accounting/src/routes/vendors.tsx'),
    route(
      'accounting/vendors/:partyRefId',
      '../../../core/accounting/src/routes/vendor-statement.tsx'
    ),
    route(
      'accounting/customers',
      '../../../core/accounting/src/routes/customers.tsx'
    ),
    route(
      'accounting/customers/:partyRefId',
      '../../../core/accounting/src/routes/customer-statement.tsx'
    ),
    route(
      'accounting/trial-balance',
      '../../../core/accounting/src/routes/trial-balance.tsx'
    ),
    route(
      'accounting/chart-of-accounts',
      '../../../core/accounting/src/routes/chart-of-accounts.tsx'
    ),
    route(
      'accounting/opening-balances',
      '../../../core/accounting/src/routes/opening-balances.tsx'
    ),
    route(
      'accounting/reports/profit-and-loss',
      '../../../core/accounting/src/routes/profit-and-loss.tsx'
    ),
    route(
      'accounting/reports/balance-sheet',
      '../../../core/accounting/src/routes/balance-sheet.tsx'
    ),
    route('plan-payment', '../../../core/plan/src/routes/plan-payment.tsx'),
    route('plan-status', '../../../core/plan/src/routes/plan-status.tsx'),
    route(
      'whatsapp-marketing',
      '../../../core/user/src/routes/whatsapp-marketing.tsx'
    ),
  ]),
] satisfies RouteConfig;
