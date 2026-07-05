// Dashboard types
export interface DashboardKeyMetrics {
  totalProducts: number;
  totalRevenueToday: number;
  ordersToday: number;
  lowStockItemsCount: number;
  averageOrderValue: number;
  totalCustomers: number;
  totalRevenueAllTime: number;
  totalOrdersAllTime: number;
}

export interface LowStockItem {
  inventoryId: string;
  name: string;
  currentCount: number;
  threshold: number;
  lotId: string;
  barcode: string;
  /** Pricing document ID; null for legacy inventories without pricing */
  pricingId?: string | null;
}

export interface RevenueBreakdown {
  today: number;
  yesterday: number;
  thisWeek: number;
  thisMonth: number;
  percentageChangeToday: number;
}

export interface ProductInsights {
  totalUniqueProducts: number;
  productsAddedToday: number;
  productsAddedThisWeek: number;
  productsAddedThisMonth: number;
  outOfStockItems: number;
}

export interface SalesTrendDataPoint {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface SalesTrend {
  last7Days: SalesTrendDataPoint[];
  bestDayRevenue: number;
  bestDayDate: string;
}

export interface DashboardData {
  keyMetrics: DashboardKeyMetrics;
  lowStockItems: LowStockItem[];
  revenueBreakdown: RevenueBreakdown;
  productInsights: ProductInsights;
  salesTrend: SalesTrend;
}


/** YouTube tutorial resource returned by {@code GET /api/v1/resources}. */
export interface TutorialResourceResponse {
  id: string;
  videoKey: string;
  title: string;
  description: string;
  youtubeUrl: string;
  youtubeVideoId: string | null;
  routePaths: string[];
  sortOrder: number;
}
