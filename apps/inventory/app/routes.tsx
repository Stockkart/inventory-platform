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
    route('', './routes/dashboard.tsx'),
    route('shops', './routes/dashboard.shops.tsx'),
    route('profile', './routes/dashboard.profile.tsx'),
    route('customers', './routes/dashboard.customers.tsx'),
    route('vendors', './routes/dashboard.vendors.tsx'),
    route(
      'product-registration',
      './routes/dashboard.product-registration.tsx'
    ),
    route('import', './routes/dashboard.import.tsx'),
    route('product-search', './routes/dashboard.product-search.tsx'),
    route('pricing', './routes/dashboard.pricing.tsx'),
    route('scan-sell', './routes/dashboard.scan-sell.tsx'),
    route('menu-sell', './routes/dashboard.menu-sell.tsx'),
    route('menu', './routes/dashboard.menu.tsx'),
    route('manual-stock', './routes/dashboard.manual-stock.tsx'),
    route('checkout', './routes/dashboard.checkout.tsx'),
    route('payment-billing', './routes/dashboard.payment-billing.tsx'),
    route('analytics', './routes/dashboard.analytics.tsx'),
    route('inventory-alert', './routes/dashboard.inventory-alert.tsx'),
    route('reminders', './routes/dashboard.reminders.tsx'),
    route('invitations', './routes/dashboard.invitations.tsx'),
    route('my-invitations', './routes/dashboard.my-invitations.tsx'),
    route('shop-users', './routes/dashboard.shop-users.tsx'),
    route('access-control', './routes/dashboard.access-control.tsx'),
    route('join-requests', './routes/dashboard.join-requests.tsx'),
    route('history', './routes/dashboard.history.tsx'),
    route(
      'vendor-invoices',
      './routes/dashboard.vendor-invoices.tsx'
    ),
    route('stock-corrections', './routes/dashboard.stock-corrections.tsx'),
    route('vendor-return', './routes/dashboard.vendor-return.tsx'),
    route('refund', './routes/dashboard.refund.tsx'),
    route('price-edit/:pricingId', './routes/dashboard.price-edit.tsx'),
    route('taxes', './routes/dashboard.taxes.tsx'),
    route('credit', './routes/dashboard.credit.tsx'),
    route('accounting', './routes/dashboard.accounting.tsx'),
    route('accounting/journal', './routes/dashboard.accounting.journal.tsx'),
    route(
      'accounting/journal/new',
      './routes/dashboard.accounting.journal.new.tsx'
    ),
    route(
      'accounting/journal/:entryId',
      './routes/dashboard.accounting.journal.$entryId.tsx'
    ),
    route('accounting/ledger', './routes/dashboard.accounting.ledger.tsx'),
    route(
      'accounting/ledger/:accountId',
      './routes/dashboard.accounting.ledger.$accountId.tsx'
    ),
    route('accounting/vendors', './routes/dashboard.accounting.vendors.tsx'),
    route(
      'accounting/vendors/:partyRefId',
      './routes/dashboard.accounting.vendors.$partyRefId.tsx'
    ),
    route(
      'accounting/customers',
      './routes/dashboard.accounting.customers.tsx'
    ),
    route(
      'accounting/customers/:partyRefId',
      './routes/dashboard.accounting.customers.$partyRefId.tsx'
    ),
    route(
      'accounting/trial-balance',
      './routes/dashboard.accounting.trial-balance.tsx'
    ),
    route(
      'accounting/chart-of-accounts',
      './routes/dashboard.accounting.chart-of-accounts.tsx'
    ),
    route(
      'accounting/opening-balances',
      './routes/dashboard.accounting.opening-balances.tsx'
    ),
    route(
      'accounting/reports/profit-and-loss',
      './routes/dashboard.accounting.reports.profit-and-loss.tsx'
    ),
    route(
      'accounting/reports/balance-sheet',
      './routes/dashboard.accounting.reports.balance-sheet.tsx'
    ),
    route('plan-payment', './routes/dashboard.plan-payment.tsx'),
    route('plan-status', './routes/dashboard.plan-status.tsx'),
    route('whatsapp-marketing', './routes/dashboard.whatsapp-marketing.tsx'),
  ]),
] satisfies RouteConfig;
