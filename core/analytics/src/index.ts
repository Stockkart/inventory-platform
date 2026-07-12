export {
  analyticsApi,
  type SalesAnalyticsParams,
  type ProfitAnalyticsParams,
  type InventoryAnalyticsParams,
  type VendorAnalyticsParams,
  type CustomerAnalyticsParams,
  type ExpiryBucketsParams,
} from './api/analytics.api';
export { ANALYTICS_ENDPOINTS } from './api/endpoints';
export { analyticsKeys, ANALYTICS_MODULE_VERSION } from './queries/keys';
export * from './queries/hooks';
export { analyticsRoutes } from './routes';
export { analyticsNav } from './nav';

export { AnalyticsPage, AnalyticsPage as InventoryPlatformAnalytics } from './pages/AnalyticsPage';
export { SalesAnalytics } from './ui/SalesAnalytics';
export { ProfitAnalytics } from './ui/ProfitAnalytics';
export { VendorAnalytics } from './ui/VendorAnalytics';
export { CustomerAnalytics } from './ui/CustomerAnalytics';
export { InventoryAnalytics } from './ui/InventoryAnalytics';
export { SummaryCards } from './ui/SummaryCards';
export { RevenueChart } from './ui/RevenueChart';
export { TopProductsChart } from './ui/TopProductsChart';
export { SalesByGroupChart } from './ui/SalesByGroupChart';
export { SalesByGroupPieChart } from './ui/SalesByGroupPieChart';
export { ComparisonMetrics } from './ui/ComparisonMetrics';
export { ProfitSummaryCards } from './ui/ProfitSummaryCards';
export { ProfitByGroupChart } from './ui/ProfitByGroupChart';
export { ProfitByGroupPieChart } from './ui/ProfitByGroupPieChart';
export { CostPriceTrendsChart } from './ui/CostPriceTrendsChart';
export { DiscountImpactCard } from './ui/DiscountImpactCard';
export { LowMarginProductsTable } from './ui/LowMarginProductsTable';
