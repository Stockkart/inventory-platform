// Analytics types
export interface SalesAnalytics {
  summary: {
    totalRevenue: number;
    totalPurchases: number;
    averageOrderValue: number;
    totalTax: number;
    totalDiscount: number;
  };
  topProducts: Array<{
    inventoryId: string;
    productName: string;
    lotId: string | null;
    companyName: string;
    totalQuantitySold: number;
    totalRevenue: number;
    numberOfSales: number;
  }>;
  salesByProduct: Array<{
    groupKey: string;
    totalQuantitySold: number;
    totalRevenue: number;
    numberOfSales: number;
  }>;
  salesByLotId: Array<{
    groupKey: string | null;
    totalQuantitySold: number;
    totalRevenue: number;
    numberOfSales: number;
  }>;
  salesByCompany: Array<{
    groupKey: string;
    totalQuantitySold: number;
    totalRevenue: number;
    numberOfSales: number;
  }>;
  timeSeries: Array<{
    period: string;
    startTime: string;
    endTime: string;
    revenue: number;
    purchaseCount: number;
    averageOrderValue: number;
  }>;
  periodComparison: {
    currentPeriod: {
      totalRevenue: number;
      totalPurchases: number;
      averageOrderValue: number;
      totalTax: number;
      totalDiscount: number;
    };
    previousPeriod: {
      totalRevenue: number;
      totalPurchases: number;
      averageOrderValue: number;
      totalTax: number;
      totalDiscount: number;
    };
    revenueChange: number;
    revenueChangePercent: number;
    purchaseCountChange: number;
    purchaseCountChangePercent: number;
    aovChange: number;
    aovChangePercent: number;
  } | null;
  meta: {
    endDate: string;
    totalPurchases: number;
    startDate: string;
  };
}

// Profit Analytics types
export interface ProfitAnalytics {
  totalRevenue: number;
  totalCost: number;
  totalGrossProfit: number;
  overallMarginPercent: number;
  totalItemsSold: number;
  totalPurchases: number;
  productProfits: Array<{
    inventoryId: string;
    productName: string;
    lotId: string | null;
    companyName: string;
    businessType: string;
    totalQuantitySold: number;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    marginPercent: number;
    numberOfSales: number;
  }>;
  profitByProduct: Array<{
    groupKey: string;
    totalQuantitySold: number;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    marginPercent: number;
    numberOfSales: number;
  }>;
  profitByLotId: Array<{
    groupKey: string | null;
    totalQuantitySold: number;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    marginPercent: number;
    numberOfSales: number;
  }>;
  profitByBusinessType: Array<{
    groupKey: string;
    totalQuantitySold: number;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    marginPercent: number;
    numberOfSales: number;
  }>;
  discountImpact: {
    totalDiscountGiven: number;
    totalRevenueWithDiscount: number;
    estimatedRevenueWithoutDiscount: number;
    revenueLostToDiscount: number;
    discountPercentOfRevenue: number;
    totalItemsWithDiscount: number;
    totalItemsSold: number;
    averageDiscountPerItem: number;
  };
  costPriceTrends: Array<{
    period: string;
    startTime: string;
    endTime: string;
    averageCostPrice: number;
    averagePriceToRetail: number;
    averageMargin: number;
    averageMarginPercent: number;
    totalItemsSold: number;
  }>;
  lowMarginProducts: Array<{
    inventoryId: string;
    productName: string;
    lotId: string | null;
    companyName: string;
    businessType: string;
    totalQuantitySold: number;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    marginPercent: number;
    numberOfSales: number;
  }>;
  meta: {
    lowMarginThreshold: number;
    endDate: string;
    totalPurchases: number;
    startDate: string;
  };
}


// Vendor Analytics types
export interface VendorStockAnalytics {
  vendorId: string;
  vendorName: string;
  vendorCompanyName: string | null;
  totalInventoryReceived: number;
  totalQuantitySold: number;
  totalUnsoldStock: number;
  totalExpiredStock: number;
  sellThroughPercentage: number;
  revenueGenerated: number;
  unsoldStockValue: number;
  expiredStockValue: number;
  numberOfProducts: number;
  numberOfLots: number;
}

export interface VendorRevenueAnalytics {
  vendorId: string;
  vendorName: string;
  vendorCompanyName: string | null;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number;
  totalItemsSold: number;
  totalPurchases: number;
}

export interface VendorPerformanceAnalytics {
  vendorId: string;
  vendorName: string;
  vendorCompanyName: string | null;
  averageDaysInStock: number;
  fastMovingItemsPercentage: number;
  deadStockValue: number;
  expiredStockValue: number;
  expiryLossPercentage: number;
  totalExpiredItems: number;
  totalDeadStockItems: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface CategoryExpiryAnalytics {
  vendorId: string;
  vendorName: string;
  businessType: string;
  totalReceived: number;
  totalExpired: number;
  expiryPercentage: number;
  expiredStockValue: number;
}

export interface VendorDependencyAnalytics {
  vendorId: string;
  vendorName: string;
  vendorCompanyName: string | null;
  revenuePercentage: number;
  inventoryPercentage: number;
  numberOfProducts: number;
  dependencyScore: number;
  dependencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface VendorAnalytics {
  totalVendors: number;
  totalInventoryValue: number;
  totalRevenue: number;
  totalExpiredStockValue: number;
  totalUnsoldStockValue: number;
  vendorStockAnalytics: VendorStockAnalytics[];
  vendorRevenueAnalytics: VendorRevenueAnalytics[];
  vendorPerformanceAnalytics: VendorPerformanceAnalytics[];
  categoryExpiryAnalytics: CategoryExpiryAnalytics[];
  vendorDependencyAnalytics: VendorDependencyAnalytics[];
  topVendorRevenuePercentage: number;
  top3VendorRevenuePercentage: number;
  mostDependentVendorId: string;
  mostDependentVendorName: string;
  meta: {
    endDate: string;
    totalPurchases: number;
    totalInventories: number;
    startDate: string;
  };
}

// Customer Analytics types
export interface TopCustomer {
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  totalPurchases: number;
  totalRevenue: number;
  averageOrderValue: number;
  customerLifetimeValue: number;
  purchaseFrequency: number;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  daysSinceLastPurchase: number;
  isRepeatCustomer: boolean;
  purchaseCountInPeriod: number;
}

export interface CustomerAnalytics {
  summary: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    newCustomerPercentage: number;
    returningCustomerPercentage: number;
    averagePurchaseFrequency: number;
    averageSpendPerCustomer: number;
    averageCustomerLifetimeValue: number;
  };
  topCustomers: TopCustomer[];
  allCustomers: TopCustomer[] | null;
  meta: {
    totalCustomers: number;
    endDate: string;
    totalPurchases: number;
    totalAllPurchases: number;
    includeAll: boolean;
    startDate: string;
    topN: number;
  };
}

// Inventory Analytics types
export interface InventoryItemAnalytics {
  inventoryId: string;
  lotId: string | null;
  barcode: string;
  productName: string;
  companyName: string;
  businessType: string;
  location: string;
  receivedCount: number;
  soldCount: number;
  currentCount: number;
  isLowStock: boolean;
  stockPercentage: number;
  daysSinceReceived: number;
  daysUntilExpiry: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
  turnoverRatio: number;
  isDeadStock: boolean;
  costValue: number;
  retailValue: number;
  potentialProfit: number;
  marginPercent: number;
  receivedDate: string;
  expiryDate: string;
  lastSoldDate: string | null;
  /** Pricing document ID; null for legacy inventories without pricing */
  pricingId?: string | null;
}

export interface InventoryAnalytics {
  summary: {
    totalProducts: number;
    lowStockProducts: number;
    expiredProducts: number;
    expiringSoonProducts: number;
    deadStockProducts: number;
    totalCostValue: number;
    totalRetailValue: number;
    totalPotentialProfit: number;
    averageTurnoverRatio: number;
    averageStockPercentage: number;
  };
  lowStockItems: InventoryItemAnalytics[];
  notSellingItems: InventoryItemAnalytics[];
  expiringSoonItems: InventoryItemAnalytics[];
  expiredItems: InventoryItemAnalytics[];
  deadStockItems: InventoryItemAnalytics[];
  allItems: InventoryItemAnalytics[] | null;
  meta: {
    totalItems: number;
    expiringSoonDays: number;
    lowStockThreshold: number;
    deadStockDays: number;
    includeAll: boolean;
  };
}

