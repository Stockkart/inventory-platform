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
  route('plans', './routes/plans.tsx'),
  route('shop-selection', './routes/shop-selection.tsx'),
  route('request-join-shop', './routes/request-join-shop.tsx'),
  route('my-requests-invitations', './routes/my-requests-invitations.tsx'),
  route('onboarding', './routes/onboarding.tsx'),
  route('m/upload', './routes/m.upload.tsx'),
  route('dashboard', './routes/dashboard._layout.tsx', [
    route('', './routes/dashboard.tsx'),
    route('shops', './routes/dashboard.shops.tsx'),
    route(
      'product-registration',
      './routes/dashboard.product-registration.tsx'
    ),
    route('product-search', './routes/dashboard.product-search.tsx'),
    route('pricing', './routes/dashboard.pricing.tsx'),
    route('scan-sell', './routes/dashboard.scan-sell.tsx'),
    route('checkout', './routes/dashboard.checkout.tsx'),
    route('payment-billing', './routes/dashboard.payment-billing.tsx'),
    route('analytics', './routes/dashboard.analytics.tsx'),
    route('inventory-alert', './routes/dashboard.inventory-alert.tsx'),
    route('reminders', './routes/dashboard.reminders.tsx'),
    route('invitations', './routes/dashboard.invitations.tsx'),
    route('my-invitations', './routes/dashboard.my-invitations.tsx'),
    route('shop-users', './routes/dashboard.shop-users.tsx'),
    route('join-requests', './routes/dashboard.join-requests.tsx'),
    route('history', './routes/dashboard.history.tsx'),
    route('refund', './routes/dashboard.refund.tsx'),
    route('price-edit/:pricingId', './routes/dashboard.price-edit.tsx'),
    route('taxes', './routes/dashboard.taxes.tsx'),
    route('plan-payment', './routes/dashboard.plan-payment.tsx'),
    route('plan-status', './routes/dashboard.plan-status.tsx'),
  ]),
] satisfies RouteConfig;
