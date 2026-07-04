// Dashboard routes
export { default as DashboardLayoutRoute } from './lib/routes/dashboard._layout';
export { default as DashboardPage } from './lib/routes/dashboard';
export { default as ShopsPage } from './lib/routes/dashboard.shops';
export { default as ProfilePage } from './lib/routes/dashboard.profile';
export { default as JoinRequestsPage } from './lib/routes/dashboard.join-requests';
export { default as HistoryPage } from './lib/routes/dashboard.history';
export { default as RefundPage } from './lib/routes/dashboard.refund';
export { default as VendorReturnPage } from './lib/routes/dashboard.vendor-return';
export { default as WhatsAppMarketingPage } from './lib/routes/dashboard.whatsapp-marketing';

// Re-export meta functions
export { meta as dashboardMeta } from './lib/routes/dashboard';
export { meta as joinRequestsMeta } from './lib/routes/dashboard.join-requests';
export { meta as historyMeta } from './lib/routes/dashboard.history';
export { meta as refundMeta } from './lib/routes/dashboard.refund';
export { meta as vendorReturnMeta } from './lib/routes/dashboard.vendor-return';
