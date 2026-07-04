// Dashboard routes
export { default as DashboardLayoutRoute } from './lib/routes/dashboard._layout';
export { default as DashboardPage } from './lib/routes/dashboard';
export { default as ShopsPage } from './lib/routes/dashboard.shops';
export { default as ProfilePage } from './lib/routes/dashboard.profile';
export { default as ProductRegistrationPage } from './lib/routes/dashboard.product-registration';
export { default as ImportPage } from './lib/routes/dashboard.import';
export { default as ProductSearchPage } from './lib/routes/dashboard.product-search';
export { default as ScanSellPage } from './lib/routes/dashboard.scan-sell';
export {
  default as MenuSellPage,
} from './lib/routes/dashboard.menu-sell';
export {
  default as MenuAdminPage,
} from './lib/routes/dashboard.menu';
export {
  default as ManualStockPage,
} from './lib/routes/dashboard.manual-stock';
export {
  default as CheckoutPage,
  meta as checkoutMeta,
} from './lib/routes/dashboard.checkout';
export { default as JoinRequestsPage } from './lib/routes/dashboard.join-requests';
export { default as HistoryPage } from './lib/routes/dashboard.history';
export { default as VendorInvoicesPage } from './lib/routes/dashboard.vendor-invoices';
export { default as StockCorrectionsPage } from './lib/routes/dashboard.stock-corrections';
export { default as RefundPage } from './lib/routes/dashboard.refund';
export { default as VendorReturnPage } from './lib/routes/dashboard.vendor-return';
export { default as WhatsAppMarketingPage } from './lib/routes/dashboard.whatsapp-marketing';

// Re-export meta functions
export { meta as dashboardMeta } from './lib/routes/dashboard';
export { meta as productRegistrationMeta } from './lib/routes/dashboard.product-registration';
export { meta as importMeta } from './lib/routes/dashboard.import';
export { meta as productSearchMeta } from './lib/routes/dashboard.product-search';
export { meta as scanSellMeta } from './lib/routes/dashboard.scan-sell';
export { meta as menuSellMeta } from './lib/routes/dashboard.menu-sell';
export { meta as menuAdminMeta } from './lib/routes/dashboard.menu';
export { meta as manualStockMeta } from './lib/routes/dashboard.manual-stock';
export { meta as joinRequestsMeta } from './lib/routes/dashboard.join-requests';
export { meta as historyMeta } from './lib/routes/dashboard.history';
export { meta as vendorInvoicesMeta } from './lib/routes/dashboard.vendor-invoices';
export { meta as stockCorrectionsMeta } from './lib/routes/dashboard.stock-corrections';
export { meta as refundMeta } from './lib/routes/dashboard.refund';
export { meta as vendorReturnMeta } from './lib/routes/dashboard.vendor-return';
