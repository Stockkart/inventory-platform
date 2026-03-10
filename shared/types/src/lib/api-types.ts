// API Types - All interfaces related to API requests/responses

// Common API types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

// Product types
export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  price: number;
  cost?: number;
  quantity: number;
  reorderLevel?: number;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  price: number;
  cost?: number;
  quantity: number;
  reorderLevel?: number;
  description?: string;
}

export interface UpdateProductDto
  extends Partial<Omit<CreateProductDto, 'name' | 'sku'>> {
  name?: string;
  sku?: string;
}

// Auth types - Multi-shop support
export interface ShopMembership {
  shopId: string;
  shopName: string;
  role: string;
  relationship: 'OWNER' | 'INVITED' | null;
  joinedAt: string;
}

export interface User {
  userId: string;
  role: string;
  shopId: string | null;
  email?: string;
  name?: string;
  active?: boolean;
  createdAt?: string;
  /** All shops the user can access (multi-shop support) */
  shops?: ShopMembership[];
}

export interface Shop {
  name?: string;
}

export interface LoginDto {
  idToken?: string; // For Google/Facebook login
  loginType?: 'google' | 'facebook'; // Required if idToken is provided
  email?: string; // Required if idToken is not provided
  password?: string; // Required if idToken is not provided
}

export interface SignupDto {
  idToken?: string; // For Google/Facebook signup
  signupType?: 'google' | 'facebook'; // Required if idToken is provided
  name?: string; // Required if idToken is not provided
  email?: string; // Required if idToken is not provided
  password?: string; // Required if idToken is not provided
  shopId?: string;
  role?: string; // Default role if not provided
}

export interface AcceptInviteDto {
  inviteToken: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  shop: Shop;
}

export interface AcceptInviteResponse {
  userId: string;
  role: string;
  shopId: string;
  active: boolean;
}

export interface LogoutDto {
  userId: string;
  accessToken: string;
}

export interface LogoutResponse {
  deviceId: string;
}

// Multi-shop API types
export interface SetActiveShopRequest {
  shopId: string;
}

export interface SetActiveShopResponse {
  activeShopId: string;
  message: string;
}

export interface UserShopsResponse {
  data: ShopMembership[];
}

// Order types
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'cancelled';
  customerName?: string;
  createdAt: string;
}

export interface CreateOrderDto {
  items: Omit<OrderItem, 'total'>[];
  paymentMethod: string;
  customerName?: string;
}

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

// Alert types
export interface InventoryAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  status: 'critical' | 'warning';
  createdAt: string;
}

// Reminder types
export type ReminderStatus = 'PENDING' | 'COMPLETED';
export type ReminderType = 'EXPIRY' | 'CUSTOM' | null;

export interface Reminder {
  id: string;
  inventoryId: string | null;
  reminderAt: string;
  expiryDate: string | null;
  snoozeDays: number;
  notes: string | null;
  status: ReminderStatus;
  type: ReminderType;
}

export interface CreateReminderDto {
  inventoryId?: string;
  reminderAt: string;
  endDate?: string;
  notes?: string;
  type?: ReminderType;
}

export interface UpdateReminderDto {
  reminderAt?: string;
  endDate?: string;
  notes?: string;
  status?: ReminderStatus;
}

export interface CustomReminderInput {
  reminderAt: string;
  endDate: string;
  notes?: string;
}

export interface ReminderInventorySummary {
  id: string | null;
  lotId: string | null;
  name: string;
  companyName: string;
  location: string;
  vendorId: string | null;
  batchNo: string | null;
  maximumRetailPrice: number;
  costPrice: number;
  priceToRetail: number;
}

export interface ReminderDetail extends Reminder {
  inventory: ReminderInventorySummary | null;
}

export interface ReminderDetailListResponse {
  data: ReminderDetail[];
}

export interface PageMeta {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface ReminderDetailListResponse {
  data: ReminderDetail[];
  meta: PageMeta;
}

//event types
export interface ReminderNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  type: 'REMINDER_DUE' | 'INVENTORY_LOW';
}

export type InventoryLowEvent = {
  shopId: string;
  inventoryId: string;
  productName: string;
  currentCount: number;
  threshold: number;
};

// Shop types
export interface Location {
  primaryAddress: string;
  secondaryAddress?: string;
  state: string;
  city: string;
  pin: string;
  country: string;
}

export type ShopType = 'RETAILER' | 'DISTRIBUTOR' | 'WHOLESALER';

export interface RegisterShopDto {
  name: string;
  businessId: string;
  location: Location;
  contactEmail: string;
  contactPhone: string;
  shopType?: ShopType;
  gstinNo?: string;
  fssai?: string;
  dlNo?: string;
  panNo?: string;
  sgst?: string;
  cgst?: string;
  tagline?: string;
}

export interface RegisterShopResponse {
  shopId: string;
  status: string;
}

export interface RequestJoinShopDto {
  ownerEmail: string;
  shopId: string;
  role: string;
  message?: string;
}

export interface OwnerShopSummary {
  shopId: string;
  shopName: string;
}

export interface OwnerShopsResponse {
  data: OwnerShopSummary[];
}

export interface RequestJoinShopResponse {
  requestId: string;
  shopId: string;
  shopName: string;
  status: string;
  message: string;
  createdAt: string;
}

export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface JoinRequest {
  requestId: string;
  shopId: string;
  shopName: string;
  userId: string;
  userEmail: string;
  userName: string;
  requestedRole: string;
  status: JoinRequestStatus;
  message: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface JoinRequestsResponse {
  data: JoinRequest[];
}

export interface ProcessJoinRequestDto {
  action: 'ACCEPT' | 'REJECT';
}

export interface ProcessJoinRequestResponse {
  requestId: string;
  shopId: string;
  shopName: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: string;
  reviewedAt: string;
  message: string;
}

// Inventory types
export type ItemType = 'NORMAL' | 'COSTLY' | 'DEGREE';
export type DiscountApplicable =
  | 'DISCOUNT'
  | 'SCHEME'
  | 'DISCOUNT_AND_SCHEME';

export type SchemeType = 'FIXED_UNITS' | 'PERCENTAGE';
export type BillingMode = 'REGULAR' | 'BASIC';

export interface UnitConversion {
  unit: string;
  factor: number;
}

export interface AvailableUnit {
  unit: string;
  baseUnit: boolean;
}

export interface CreateInventoryDto {
  barcode: string;
  name: string;
  companyName: string;
  price: number;
  maximumRetailPrice: number;
  costPrice: number;
  priceToRetail: number;
  businessType: string;
  location: string;
  count: number;
  expiryDate: string;
  description?: string;
  reminderAt?: string;
  customReminders?: CustomReminderInput[];
  vendorId?: string;
  /** When true, record this purchase as credit (buyer owes vendor). When false, treated as paid/cash. */
  onCredit?: boolean | null;
  /** When vendor is a StockKart user and purchase is on credit, assign to vendor's shop so they can see it. */
  vendorShopId?: string | null;
  lotId?: string;
  hsn?: string;
  sac?: string;
  batchNo?: string;
  scheme?: number | null;
  schemeType?: SchemeType;
  schemePercentage?: number | null;
  additionalDiscount?: number | null;
  itemType?: ItemType;
  itemTypeDegree?: number;
  discountApplicable?: DiscountApplicable;
  billingMode?: BillingMode;
  purchaseDate?: string;
  baseUnit?: string;
  unitConversions?: UnitConversion | null;
}

export interface InventoryResponse {
  id: string;
  lotId: string | null;
  barcode: string;
  reminderCreated: boolean;
  billingMode?: BillingMode;
}

export interface BulkCreateInventoryItem {
  barcode: string;
  name: string;
  description?: string;
  companyName: string;
  maximumRetailPrice: number;
  costPrice: number;
  priceToRetail: number;
  businessType: string;
  location: string;
  count: number;
  thresholdCount?: number;
  expiryDate: string;
  reminderAt?: string;
  customReminders?: Array<{
    daysBefore: number;
    message: string;
  }> | null;
  hsn?: string | null;
  sac?: string | null;
  batchNo?: string | null;
  scheme?: number | null;
  schemeType?: SchemeType;
  schemePercentage?: number | null;
  sgst?: string | null;
  cgst?: string | null;
  additionalDiscount?: number | null;
  itemType?: ItemType;
  itemTypeDegree?: number;
  discountApplicable?: DiscountApplicable;
  billingMode?: BillingMode;
  purchaseDate?: string;
  baseUnit?: string;
  unitConversions?: UnitConversion | null;
  /** Optional. Array of custom rates { name, price }. */
  rates?: Array<{ name: string; price: number }> | null;
  /** Optional. Must be empty/null or one of: rates[].name, "priceToRetail", "maximumRetailPrice", "costPrice". */
  defaultRate?: string | null;
}

export interface BulkCreateInventoryDto {
  vendorId: string;
  /** When true, record this purchase as credit (buyer owes vendor). */
  onCredit?: boolean | null;
  /** When vendor is a StockKart user and purchase is on credit, assign to vendor's shop. */
  vendorShopId?: string | null;
  lotId?: string | null;
  items: BulkCreateInventoryItem[];
}

export interface BulkCreateInventoryResponse {
  success: boolean;
  lotId?: string | null;
  createdCount: number;
  items: Array<{
    id: string;
    barcode: string;
    reminderCreated: boolean;
  }>;
}

export interface ParseInvoiceItem {
  barcode: string;
  name: string;
  description?: string | null;
  companyName?: string | null;
  maximumRetailPrice: number;
  costPrice?: number | null;
  priceToRetail: number;
  businessType: string;
  location?: string | null;
  count?: number | null;
  thresholdCount?: number | null;
  expiryDate?: string | null;
  reminderAt?: string | null;
  customReminders?: CustomReminderInput[] | null;
  hsn?: string | null;
  sac?: string | null;
  batchNo?: string | null;
  scheme?: number | null;
  schemeType?: SchemeType;
  schemePercentage?: number | null;
  sgst?: string | null;
  cgst?: string | null;
  additionalDiscount?: number | null;
  itemType?: ItemType;
  itemTypeDegree?: number;
  discountApplicable?: DiscountApplicable;
  billingMode?: BillingMode;
  purchaseDate?: string | null;
  baseUnit?: string | null;
  unitConversions?: UnitConversion | null;
  rates?: Array<{ name: string; price: number }> | null;
  defaultRate?: string | null;
}

export interface ParseInvoiceResponse {
  items: ParseInvoiceItem[];
  totalItems: number;
}

export interface InventoryItem {
  id: string;
  lotId: string;
  barcode: string | null;
  name: string | null;
  description: string | null;
  companyName: string | null;
  maximumRetailPrice: number;
  costPrice: number;
  priceToRetail: number;
  receivedCount: number;
  soldCount: number;
  thresholdCount?: number;
  currentCount: number;
  location: string;
  expiryDate: string;
  shopId: string;
  vendorId?: string | null;
  hsn?: string | null;
  sac?: string | null;
  batchNo?: string | null;
  scheme?: number | null;
  schemeType?: SchemeType;
  schemePercentage?: number | null;
  sgst?: string | null;
  cgst?: string | null;
  additionalDiscount?: number | null;
  createdAt?: string;
  itemType?: ItemType;
  itemTypeDegree?: number;
  discountApplicable?: DiscountApplicable;
  billingMode?: BillingMode;
  purchaseDate?: string;
  baseUnit?: string | null;
  unitConversions?: UnitConversion | null;
  availableUnits?: AvailableUnit[] | null;
  receivedBaseCount?: number | null;
  soldBaseCount?: number | null;
  currentBaseCount?: number | null;
  /** Pricing document ID; null for legacy inventories without pricing */
  pricingId?: string | null;
  rates?: PricingRate[] | null;
  defaultRate?: string | null;
  /** Effective selling price (based on defaultRate); use for display and cart. Falls back to priceToRetail. */
  sellingPrice?: number | null;
}

/** Partial update - only non-null fields are updated. Omitted fields keep current values. */
export interface UpdateInventoryRequest {
  barcode?: string | null;
  name?: string | null;
  description?: string | null;
  companyName?: string | null;
  businessType?: string | null;
  location?: string | null;
  maximumRetailPrice?: number | null;
  costPrice?: number | null;
  priceToRetail?: number | null;
  rates?: PricingRate[] | null;
  defaultRate?: string | null;
  additionalDiscount?: number | null;
  sgst?: string | null;
  cgst?: string | null;
  expiryDate?: string | null;
  hsn?: string | null;
  batchNo?: string | null;
  vendorId?: string | null;
  thresholdCount?: number | null;
  billingMode?: BillingMode | null;
  itemType?: ItemType | null;
  itemTypeDegree?: number | null;
  discountApplicable?: DiscountApplicable | null;
  purchaseDate?: string | null;
  schemeType?: SchemeType | null;
  scheme?: number | null;
  schemePercentage?: number | null;
  baseUnit?: string | null;
  unitConversions?: UnitConversion | null;
}

export interface InventoryListResponse {
  data: InventoryItem[];
  meta: unknown | null;
  page?: {
    page: number;
    size: number;
    totalItems: number;
    totalPages: number;
  } | null;
}

export interface PaginationInventoryResponse {
  data: InventoryItem[];
  meta: unknown | null;
  page: PageMeta;
}

// Lot types
export interface Lot {
  lotId: string;
  productCount: number;
  createdAt: string;
  lastUpdated: string;
  firstProductName: string;
  /** Pricing document ID; null for legacy lots without pricing */
  pricingId?: string | null;
}

export interface LotsListResponse {
  data: Lot[];
  meta: unknown | null;
  page: PageMeta;
}

// Checkout types
export interface CheckoutItem {
  id: string;
  unit?: string;
  quantity?: number;
  baseQuantity?: number;
  priceToRetail?: number;
  additionalDiscount?: number | null;
  // Scheme can be represented either as fixed units or percentage
  schemeType?: SchemeType | null;
  schemePercentage?: number | null;
  schemePayFor?: number | null;
  schemeFree?: number | null;
}

export interface CreateCheckoutDto {
  businessType: string;
  paymentMethod: string;
  items: CheckoutItem[];
}

export interface CheckoutItemResponse {
  inventoryId: string;
  name: string;
  quantity: number;
  saleUnit?: string | null;
  baseQuantity?: number | null;
  unitFactor?: number | null;
  availableUnits?: AvailableUnit[] | null;
  maximumRetailPrice: number;
  priceToRetail: number;
  discount: number;
  additionalDiscount?: number | null;
  totalAmount: number;
  sgst?: string | null;
  cgst?: string | null;
  schemeType?: SchemeType | null;
  schemePayFor?: number | null;
  schemeFree?: number | null;
  schemePercentage?: number | null;
  costPrice?: number | null;
  costTotal?: number | null;
  profit?: number | null;
  marginPercent?: number | null;
  billingMode?: BillingMode;
}

export interface CheckoutResponse {
  invoiceId: string;
  invoiceNo: string;
  businessType: string;
  userId: string;
  shopId: string;
  items: CheckoutItemResponse[];
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  paymentMethod: string;
  status: string;
  totalCost?: number | null;
  revenueBeforeTax?: number | null;
  revenueAfterTax?: number | null;
  totalProfit?: number | null;
  marginPercent?: number | null;
  billingMode?: BillingMode;
}

// Cart types
export interface CartResponse {
  purchaseId: string;
  invoiceId: string;
  invoiceNo: string;
  businessType: string;
  userId: string;
  shopId: string;
  items: CheckoutItemResponse[];
  subTotal: number;
  taxTotal: number;
  sgstAmount?: number;
  cgstAmount?: number;
  discountTotal: number;
  additionalDiscountTotal: number;
  grandTotal: number;
  status: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerGstin?: string;
  customerDlNo?: string;
  customerPan?: string;
  customerId?: string;
  paymentMethod?: string;
  totalCost?: number | null;
  revenueBeforeTax?: number | null;
  revenueAfterTax?: number | null;
  totalProfit?: number | null;
  marginPercent?: number | null;
  billingMode?: BillingMode;
}

export interface AddToCartDto {
  businessType: string;
  items: CheckoutItem[];
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerGstin?: string;
  customerDlNo?: string;
  customerPan?: string;
  /** Links customer to a StockKart user. Enables credit sync; user sees "Amount to Pay" in their shop. */
  customerUserId?: string;
}

export interface UpdateCartStatusDto {
  purchaseId: string;
  status: string;
  paymentMethod: string;
}

// Purchase History types
export interface Purchase {
  purchaseId: string;
  invoiceId: string;
  invoiceNo: string;
  businessType: string;
  userId: string;
  shopId: string;
  items: CheckoutItemResponse[];
  subTotal: number;
  taxTotal: number;
  sgstAmount?: number;
  cgstAmount?: number;
  discountTotal: number;
  grandTotal: number;
  soldAt: string;
  status: string;
  paymentMethod: string;
  customerName: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  totalCost?: number | null;
  revenueBeforeTax?: number | null;
  revenueAfterTax?: number | null;
  totalProfit?: number | null;
  marginPercent?: number | null;
  billingMode?: BillingMode;
}

export interface PurchaseHistoryResponse {
  purchases: Purchase[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetPurchasesParams {
  page?: number;
  limit?: number;
  order?: string; // e.g., "soldAt:desc"
  status?: string; // Filter by status (e.g., "COMPLETED", "CANCELLED")
}

export interface SearchPurchasesParams {
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  invoiceNo?: string;
  page?: number;
  limit?: number;
}

export interface SearchPurchasesResponse {
  purchases: Purchase[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Refund types
export interface RefundItem {
  inventoryId: string;
  quantity: number;
}

export interface CreateRefundDto {
  purchaseId: string;
  items: RefundItem[];
}

export interface RefundedItem {
  inventoryId: string;
  name: string;
  quantity: number;
  priceToRetail: number;
  itemRefundAmount: number;
}

export interface RefundResponse {
  refundId: string;
  purchaseId: string;
  refundedItems: RefundedItem[];
  refundAmount: number;
  totalItemsRefunded: number;
  createdAt: string;
}

export interface Refund {
  refundId: string;
  purchaseId: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  refundAmount: number;
  totalItemsRefunded: number;
  reason: string | null;
  createdAt: string;
}

export interface GetRefundsParams {
  page?: number;
  limit?: number;
  invoiceNo?: string;
  customerPhone?: string;
  customerId?: string;
  customerEmail?: string;
}

export interface GetRefundsResponse {
  refunds: Refund[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Invitation types
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface Invitation {
  invitationId: string;
  shopId: string;
  shopName: string;
  inviterUserId: string;
  inviterName: string;
  inviteeUserId?: string;
  inviteeEmail: string;
  inviteeName?: string;
  role: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
}

export interface SendInvitationDto {
  inviteeEmail: string;
  role: string;
}

export interface SendInvitationResponse {
  invitationId: string;
  shopId: string;
  inviteeEmail: string;
  role: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
  message: string;
}

export interface AcceptInvitationResponse {
  invitationId: string;
  shopId: string;
  shopName: string;
  userId: string;
  role: string;
  acceptedAt: string;
  message: string;
}

export interface InvitationsResponse {
  data: Invitation[];
}

// Shop User types
export type UserRelationship = 'OWNER' | 'INVITED' | null;

export interface ShopUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  relationship: UserRelationship;
  active: boolean;
  joinedAt: string | null;
}

export interface ShopUsersResponse {
  data: ShopUser[];
}

// User Role type
export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER';

/** Minimal user info when searching to link vendor/customer to a registered user */
export interface LinkableUser {
  userId: string;
  email: string;
  name: string;
}

// Credit Ledger types
export type LedgerPartyType = 'VENDOR' | 'CUSTOMER';
export type LedgerEntryType = 'DEBIT' | 'CREDIT';
export type LedgerSource =
  | 'PURCHASE'
  | 'SALE'
  | 'PAYMENT'
  | 'ADJUSTMENT';
export type LedgerReferenceType =
  | 'INVENTORY'
  | 'PURCHASE'
  | 'PAYMENT_RECEIPT'
  | 'ADJUSTMENT';

export interface LedgerEntry {
  id: string;
  shopId: string;
  partyType: LedgerPartyType;
  partyId: string;
  /** Resolved vendor or customer name for display */
  partyName?: string | null;
  /** Resolved counterparty shop name (vendor's shop when assigned) */
  counterpartyShopName?: string | null;
  /** Display name for Party column: vendor/customer when we're buyer, buyer shop when we're vendor */
  displayPartyName?: string | null;
  /** Our role: BUYER (we owe), VENDOR (they owe us as vendor), or SELLER (customer owes us) */
  roleInEntry?: 'BUYER' | 'VENDOR' | 'SELLER' | null;
  counterpartyShopId?: string | null;
  amount: number;
  type: LedgerEntryType;
  source: LedgerSource;
  referenceId?: string | null;
  referenceType?: LedgerReferenceType | null;
  description?: string | null;
  createdByUserId?: string | null;
  createdAt: string;
}

export interface LedgerBalance {
  shopId: string;
  partyType: LedgerPartyType;
  partyId: string;
  balance: number;
}

export interface CreateLedgerEntryRequest {
  partyType: LedgerPartyType;
  partyId: string;
  amount: number;
  type: LedgerEntryType;
  source: LedgerSource;
  referenceId?: string | null;
  referenceType?: LedgerReferenceType | null;
  description?: string | null;
}

export interface LedgerEntriesResponse {
  entries: LedgerEntry[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

/** Amount to collect from a buyer shop (when viewing from vendor's shop) */
export interface ReceivableItem {
  buyerShopId: string;
  buyerShopName: string;
  /** Display name for who has to pay: shop name and/or owner/contact name */
  buyerPayerName?: string | null;
  vendorId: string;
  vendorName: string;
  balance: number;
}

export interface ReceivablesResponse {
  receivables: ReceivableItem[];
}

/** Amount to collect from a customer (when we sold to them on credit) */
export interface CustomerReceivableItem {
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  balance: number;
}

export interface CustomerReceivablesResponse {
  receivables: CustomerReceivableItem[];
}

/** Amount we owe to another shop (bought from them as customer on credit) */
export interface PayableToShopItem {
  sellerShopId: string;
  sellerShopName: string;
  customerId?: string | null;
  balance: number;
}

export interface PayablesToShopsResponse {
  payables: PayableToShopItem[];
}

/** Amount to pay to a vendor (when viewing from buyer's shop) */
export interface PayableItem {
  vendorId: string;
  vendorName: string;
  counterpartyShopName?: string | null;
  balance: number;
}

export interface PayablesResponse {
  payables: PayableItem[];
}

// Vendor types
export type VendorBusinessType =
  | 'WHOLESALE'
  | 'RETAIL'
  | 'MANUFACTURER'
  | 'DISTRIBUTOR';

export interface Vendor {
  vendorId: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  companyName: string;
  businessType: VendorBusinessType;
  gstinUin?: string | null;
  /** Optional. Set when vendor is linked to a registered user. */
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVendorDto {
  name: string;
  contactEmail?: string;
  contactPhone: string;
  address?: string;
  businessType: VendorBusinessType;
  gstinUin?: string;
  /** Optional. Links vendor to a registered user (enables credit sync across shops). */
  userId?: string | null;
}

export interface VendorResponse {
  vendorId: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  companyName: string;
  businessType: VendorBusinessType;
  gstinUin?: string | null;
  /** Optional. Set when vendor is linked to a registered user. */
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Customer types
export interface Customer {
  customerId: string;
  name: string;
  phone: string;
  address: string | null;
  email: string | null;
  gstin?: string | null;
  dlNo?: string | null;
  pan?: string | null;
  /** Optional. Set when customer is linked to a registered user. */
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerResponse {
  customerId: string;
  name: string;
  phone: string;
  address: string | null;
  email: string | null;
  gstin?: string | null;
  dlNo?: string | null;
  pan?: string | null;
  /** Optional. Set when customer is linked to a registered user. */
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
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

// Plan types
export interface PlanResponse {
  id: string;
  planName: string;
  price: number;
  arcPrice: number;
  billingLimit: number | null;
  billCountLimit: number | null;
  smsLimit: number | null;
  whatsappLimit: number | null;
  userLimit: number | null;
  unlimited: boolean;
  linkedId: string | null;
  bestFor: string | null;
}

export interface UsageResponse {
  shopId: string;
  month: string;
  billingAmountUsed: number;
  billCountUsed: number;
  smsUsed: number;
  whatsappUsed: number;
}

export interface ShopPlanStatusResponse {
  shopId: string;
  planId: string | null;
  plan: PlanResponse | null;
  planExpiryDate: string | null;
  trial: boolean;
  trialExpired: boolean;
  currentUsage: UsageResponse;
  suggestedPlan: PlanResponse | null;
  billingLimitReached: boolean;
  billCountLimitReached: boolean;
  smsLimitReached: boolean;
  whatsappLimitReached: boolean;
  userLimitReached: boolean;
}

export interface AssignPlanRequest {
  planId: string;
  durationMonths: number;
  paymentMethod?: string;
}

export interface PlanTransactionResponse {
  id: string;
  shopId: string;
  planId: string;
  planName: string;
  amount: number;
  durationMonths: number;
  paymentMethod: string;
  createdAt: string;
}

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

// Upload Token types (QR Code Upload Flow)
export type UploadStatus =
  | 'PENDING'
  | 'UPLOADING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED';

export interface CreateUploadTokenResponse {
  token: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

export interface ValidateUploadTokenResponse {
  token: string;
  status: UploadStatus;
  expiresAt: string;
  errorMessage: string | null;
}

export interface UploadStatusResponse {
  token: string;
  status: UploadStatus;
  parsedInventoryId: string | null;
  errorMessage: string | null;
}

export interface ParsedItemsResponse {
  items: ParseInvoiceItem[];
  totalItems: number;
}

// Pricing API types
export interface PricingRate {
  name: string;
  price: number;
}

export interface PatchPricingDto {
  maximumRetailPrice?: number;
  priceToRetail?: number;
  rates?: PricingRate[];
  defaultRate?: string;
}

export interface BulkPricingUpdateItem {
  pricingId: string;
  maximumRetailPrice?: number;
  priceToRetail?: number;
  rates?: PricingRate[];
  defaultRate?: string;
}

export interface BulkPricingUpdateDto {
  updates: BulkPricingUpdateItem[];
}

export interface PricingResponse {
  id: string;
  shopId?: string;
  priceToRetail: number;
  maximumRetailPrice?: number;
  costPrice?: number;
  rates?: PricingRate[];
  defaultRate?: string;
  sellingPrice?: number;
  additionalDiscount?: number;
  sgst?: string | null;
  cgst?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// GSTR-1 Taxation types
export interface B2bSezDeLine {
  recipientGstin: string;
  receiverName: string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceValue: number;
  placeOfSupply: string;
  reverseCharge: string;
  applicableTaxPct: string;
  invoiceType: string;
  ecommerceGstin: string;
  rate: number;
  taxableValue: number;
  cessAmount: number;
}

export interface Gstr1B2bSummary {
  noOfRecipients: number;
  noOfInvoices: number;
  totalInvoiceValue: number;
  taxableValue: number;
  cessAmount: number;
}

export interface Gstr1B2bSezDeTab {
  summary: Gstr1B2bSummary;
  lines: B2bSezDeLine[];
}

export interface Gstr1InvoiceLine {
  invoiceNo?: string;
  invoiceDate?: string;
  invoiceValue?: number;
  placeOfSupply: string;
  applicableTaxPct: string;
  rate: number;
  taxableValue: number;
  cessAmount: number;
  ecommerceGstin?: string;
  [key: string]: unknown;
}

export interface Gstr1B2clSummary {
  noOfInvoices: number;
  totalInvoiceValue: number;
  totalTaxableValue: number;
  totalCess: number;
}

export interface Gstr1B2clTab {
  summary: Gstr1B2clSummary;
  lines: Gstr1InvoiceLine[];
}

export interface B2csLine {
  type: string;
  placeOfSupply: string;
  applicableTaxPct: string;
  rate: number;
  taxableValue: number;
  cessAmount: number;
  ecommerceGstin: string;
}

export interface Gstr1B2csSummary {
  totalTaxableValue: number;
  totalCess: number;
}

export interface Gstr1B2csTab {
  summary: Gstr1B2csSummary;
  lines: B2csLine[];
}

export interface Gstr1RefundLine {
  registered: boolean;
  recipientGstin: string;
  receiverName: string;
  noteNumber: string;
  noteDate: string;
  noteType: string;
  placeOfSupply: string;
  reverseCharge: string;
  noteSupplyType: string;
  noteValue: number;
  applicableTaxPct: string;
  rate: number;
  taxableValue: number;
  cessAmount: number;
  urType: string;
}

export interface Gstr1CdnrSummary {
  noOfRecipients: number;
  noOfNotes: number;
  totalNoteValue: number;
  totalTaxableValue: number;
  totalCess: number;
}

export interface Gstr1CdnrTab {
  summary: Gstr1CdnrSummary;
  lines: Gstr1RefundLine[];
}

export interface Gstr1CdnurSummary {
  noOfNotes: number;
  totalNoteValue: number;
  totalTaxableValue: number;
  totalCess: number;
}

export interface Gstr1CdnurTab {
  summary: Gstr1CdnurSummary;
  lines: Gstr1RefundLine[];
}

export interface Gstr1ExpSummary {
  noOfInvoices: number;
  totalInvoiceValue: number;
  noOfShippingBills: number;
  totalTaxableValue: number;
}

export interface Gstr1ExpTab {
  summary: Gstr1ExpSummary;
  lines: Gstr1InvoiceLine[];
}

export interface Gstr1AdvanceLine {
  placeOfSupply: string;
  applicableTaxPct: string;
  rate: number;
  grossAdvanceReceivedOrAdjusted: number;
  cessAmount: number;
  adjusted: boolean;
}

export interface Gstr1AtSummary {
  totalAdvanceReceived: number;
  totalCess: number;
}

export interface Gstr1AtTab {
  summary: Gstr1AtSummary;
  lines: Gstr1AdvanceLine[];
}

export interface Gstr1AtadjSummary {
  totalAdvanceAdjusted: number;
  totalCess: number;
}

export interface Gstr1AtadjTab {
  summary: Gstr1AtadjSummary;
  lines: Gstr1AdvanceLine[];
}

export interface Gstr1ExemptLine {
  description: string;
  nilRatedSupplies: number;
  exemptedOtherThanNilOrNonGst: number;
  nonGstSupplies: number;
}

export interface Gstr1ExempSummary {
  totalNilRatedSupplies: number;
  totalExemptedSupplies: number;
  totalNonGstSupplies: number;
}

export interface Gstr1ExempTab {
  summary: Gstr1ExempSummary;
  lines: Gstr1ExemptLine[];
}

export interface Gstr1HsnLine {
  hsn: string;
  description: string;
  uqc: string;
  totalQuantity: number;
  totalValue: number;
  rate: number;
  taxableValue: number;
  integratedTaxAmount: number;
  centralTaxAmount: number;
  stateUtTaxAmount: number;
  cessAmount: number;
  b2b: boolean;
}

export interface Gstr1HsnSummary {
  noOfHsn: number;
  totalValue: number;
  totalTaxableValue: number;
  totalIntegratedTax: number;
  totalCentralTax: number;
  totalStateUtTax: number;
  totalCess: number;
}

export interface Gstr1HsnTab {
  summary: Gstr1HsnSummary;
  lines: Gstr1HsnLine[];
}

export interface Gstr1DocumentSummaryLine {
  natureOfDocument: string;
  srNoFrom: string;
  srNoTo: string;
  totalNumber: number;
  cancelled: number;
}

export interface Gstr1DocsSummary {
  totalNumber: number;
  cancelled: number;
}

export interface Gstr1DocsTab {
  summary: Gstr1DocsSummary;
  lines: Gstr1DocumentSummaryLine[];
}

export interface Gstr1ReportResponse {
  shopId: string;
  shopGstin: string;
  period: string;
  year: number;
  month: number;
  'b2b,sez,de': Gstr1B2bSezDeTab;
  b2cl: Gstr1B2clTab;
  b2cs: Gstr1B2csTab;
  cdnr: Gstr1CdnrTab;
  cdnur: Gstr1CdnurTab;
  exp: Gstr1ExpTab;
  at: Gstr1AtTab;
  atadj: Gstr1AtadjTab;
  exemp: Gstr1ExempTab;
  'hsn(b2b)': Gstr1HsnTab;
  'hsn(b2c)': Gstr1HsnTab;
  docs: Gstr1DocsTab;
}
