// API Types - All interfaces related to API requests/responses

// Common API types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

/**
 * Canonical payment methods supported by Sales (checkout) and Purchase Registration.
 *
 * Single-tender:
 * - CASH / ONLINE / CREDIT
 *
 * Two-tender splits (the first tender is the primary one used for accounting
 * reporting; the credit slice, when present, is always the remainder that
 * posts to the credit ledger):
 * - CASH_ONLINE   (no credit; both legs paid now)
 * - ONLINE_CREDIT (online leg paid now, credit leg posts to ledger)
 * - CREDIT_CASH   (cash leg paid now, credit leg posts to ledger)
 */
export type PaymentMethod =
  | 'CASH'
  | 'ONLINE'
  | 'CREDIT'
  | 'CASH_ONLINE'
  | 'ONLINE_CREDIT'
  | 'CREDIT_CASH';

/**
 * Per-tender split for a payment. The sum of the three values must equal the
 * grand / invoice total (rounded to 2 decimals). The active PaymentMethod
 * dictates which buckets are allowed to be non-zero — see
 * `validatePaymentSplit` in the shared UI package.
 */
export interface PaymentSplit {
  cashAmount: number;
  onlineAmount: number;
  creditAmount: number;
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

export interface ForgotPasswordDto {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
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
  /** Required — must match an ACTIVE row in vertical_schemas (e.g. medical, sports). */
  verticalId: string;
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

export interface ShopDetailResponse {
  shopId: string;
  name: string;
  tagline?: string | null;
  location?: Location | null;
  /** PAN derived from GSTIN: 10 chars from 3rd character (1-based). */
  panNo?: string | null;
  verticalId?: string | null;
  pluginVersion?: string | null;
  dlNo?: string | null;
}

export interface UpdateShopDto {
  tagline?: string | null;
  location?: Location | null;
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
export type DiscountApplicable = 'DISCOUNT' | 'SCHEME' | 'DISCOUNT_AND_SCHEME';

export type SchemeType = 'FIXED_UNITS' | 'PERCENTAGE';
/** Purchase registration: free units on top of billable count (UI; persisted as FIXED_UNITS + ratio). */
export type PurchaseSchemeInputType = SchemeType | 'FREE_QUANTITY';
export type BillingMode = 'REGULAR' | 'BASIC';

export interface UnitConversion {
  unit: string;
  factor: number;
}

export interface AvailableUnit {
  unit: string;
  baseUnit: boolean;
}

/** GST UQC sell behaviour (from GET /inventory/packaging-units). */
export type SellUnitRule = 'FRACTIONAL_BASE' | 'PACK_ONLY';

export interface PackagingUnit {
  uqc: string;
  label: string;
  category: string;
  sellUnitRule: SellUnitRule;
  defaultPackUqc: string | null;
  allowsUnitsPerPack: boolean;
  registrationHint: string;
  sellHint: string;
}

export interface CreateInventoryDto {
  barcode?: string;
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
  lotId?: string;
  hsn?: string;
  sac?: string;
  batchNo?: string;
  /** @deprecated Prefer schemePayFor + schemeFree for FIXED_UNITS. */
  scheme?: number | null;
  /** When schemeType FIXED_UNITS: pay for this many (e.g. 10). Quantity in payload = count only. */
  schemePayFor?: number | null;
  /** When schemeType FIXED_UNITS: free units per batch (e.g. 2). "schemeFree free on schemePayFor". */
  schemeFree?: number | null;
  schemeType?: SchemeType;
  schemePercentage?: number | null;
  saleAdditionalDiscount?: number | null;
  itemType?: ItemType;
  itemTypeDegree?: number;
  discountApplicable?: DiscountApplicable;
  billingMode?: BillingMode;
  purchaseDate?: string;
  baseUnit?: string;
  /** Base units per pack (e.g. 50 tablets, 100 ML). Server builds unitConversions. */
  unitsPerPack?: number | null;
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
  barcode?: string;
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
  /** Core expiry (omit when schema stores expiry in verticalFields). */
  expiryDate?: string;
  reminderAt?: string;
  customReminders?: Array<{
    daysBefore: number;
    message: string;
  }> | null;
  hsn?: string | null;
  sac?: string | null;
  batchNo?: string | null;
  scheme?: number | null;
  schemePayFor?: number | null;
  schemeFree?: number | null;
  schemeType?: SchemeType;
  schemePercentage?: number | null;
  sgst?: string | null;
  cgst?: string | null;
  saleAdditionalDiscount?: number | null;
  /** Purchase scheme (from vendor) - for comparison at sale */
  purchaseSchemeType?: SchemeType | null;
  purchaseSchemePayFor?: number | null;
  purchaseSchemeFree?: number | null;
  purchaseSchemePercentage?: number | null;
  purchaseAdditionalDiscount?: number | null;
  itemType?: ItemType;
  itemTypeDegree?: number;
  discountApplicable?: DiscountApplicable;
  billingMode?: BillingMode;
  purchaseDate?: string;
  baseUnit?: string;
  unitsPerPack?: number | null;
  unitConversions?: UnitConversion | null;
  /** Optional. Array of custom rates { name, price }. */
  rates?: Array<{ name: string; price: number }> | null;
  /** Optional. Must be empty/null or one of: rates[].name, "priceToRetail", "maximumRetailPrice", "costPrice". */
  defaultRate?: string | null;
  /** Extension vertical fields (sport, brand, model, storageTemp, …). */
  verticalFields?: Record<string, unknown> | null;
}

/** Optional vendor invoice header on bulk stock-in. Omit for legacy behavior. */
export interface VendorPurchaseInvoicePayload {
  invoiceNo: string;
  invoiceDate?: string | null;
  lineSubTotal?: number | null;
  taxTotal?: number | null;
  shippingCharge?: number | null;
  otherCharges?: number | null;
  /** Bill-level discount (₹), subtracted from invoice total. */
  overallDiscount?: number | null;
  roundOff?: number | null;
  invoiceTotal?: number | null;
  /**
   * Canonical PaymentMethod (one of the 6 values). For backward compatibility
   * this stays `string` on the wire — older callers may still send 'CASH' /
   * 'ONLINE' / 'CREDIT' with `paidAmount` only.
   */
  paymentMethod?: PaymentMethod | string | null;
  /** Amount paid in cash now (new split-aware field). */
  cashAmount?: number | null;
  /** Amount paid online now (new split-aware field). */
  onlineAmount?: number | null;
  /** Amount that posts to the vendor credit ledger (new split-aware field). */
  creditAmount?: number | null;
  /**
   * Legacy single "paid now" amount. Servers should prefer the explicit
   * cash/online/credit split when present; kept for back-compat.
   * @deprecated use `cashAmount`/`onlineAmount`/`creditAmount` instead.
   */
  paidAmount?: number | null;
}

export interface BulkCreateInventoryDto {
  vendorId: string;
  /** When set, persists invoice metadata and links created inventory rows. */
  vendorPurchaseInvoice?: VendorPurchaseInvoicePayload | null;
  items: BulkCreateInventoryItem[];
}

export interface BulkCreateInventoryResponse {
  success?: boolean;
  lotId?: string | null;
  /** Backend may expose createdCount (alias) or totalCreated */
  createdCount?: number;
  totalCreated?: number;
  totalFailed?: number;
  /** Per-item errors when totalFailed &gt; 0 (product name + server message). */
  itemErrors?: string[] | null;
  vendorPurchaseInvoiceId?: string | null;
  /** Set when stock-in leaves payable due in credit ledger. */
  creditEntryId?: string | null;
  items: Array<{
    id: string;
    lotId?: string;
    barcode: string;
    reminderCreated: boolean;
  }>;
}

/** Parsed optional header from invoice OCR (all fields optional). */
export interface ParsedVendorInvoiceDto {
  invoiceNo?: string | null;
  invoiceDate?: string | null;
  lineSubTotal?: number | null;
  taxTotal?: number | null;
  shippingCharge?: number | null;
  otherCharges?: number | null;
  roundOff?: number | null;
  invoiceTotal?: number | null;
}

export interface VendorPurchaseInvoiceLineDto {
  lineIndex: number;
  name: string;
  barcode: string | null;
  count: number | null;
  costPrice: number | null;
  inventoryId: string | null;
}

export interface VendorPurchaseInvoiceSummary {
  id: string;
  vendorId: string;
  vendorName?: string | null;
  invoiceNo: string;
  invoiceDate: string | null;
  invoiceTotal: number | null;
  lineCount: number;
  createdAt: string | null;
  synthetic?: boolean | null;
  legacyLotId?: string | null;
}

export interface VendorPurchaseInvoiceDetail {
  id: string;
  vendorId: string;
  vendorName?: string | null;
  invoiceNo: string;
  invoiceDate: string | null;
  lineSubTotal: number | null;
  taxTotal: number | null;
  shippingCharge: number | null;
  otherCharges: number | null;
  overallDiscount: number | null;
  roundOff: number | null;
  invoiceTotal: number | null;
  createdAt: string | null;
  synthetic?: boolean | null;
  legacyLotId?: string | null;
  lines: VendorPurchaseInvoiceLineDto[];
}

export interface VendorPurchaseInvoiceListResponse {
  invoices: VendorPurchaseInvoiceSummary[];
  page: {
    page: number;
    size: number;
    totalItems: number;
    totalPages: number;
  };
}

/** Return stock against a vendor purchase invoice (base units — same as inventory currentBaseCount). */
export interface VendorPurchaseReturnItemPayload {
  inventoryId: string;
  baseQuantityReturned: number;
}

export interface VendorPurchaseReturnPayload {
  vendorPurchaseInvoiceId: string;
  items: VendorPurchaseReturnItemPayload[];
  reason?: string | null;
  paymentMethod: PaymentMethod | string;
  cashAmount?: number;
  onlineAmount?: number;
  creditAmount?: number;
}

export interface VendorPurchaseReturnResult {
  returnId: string;
  supplierCreditNoteNo: string;
  vendorPurchaseInvoiceId: string;
  returnAmount: number;
  totalLinesReturned: number;
  createdAt: string;
}

/** One inventory line on a supplier return record (history). */
export interface VendorPurchaseReturnLineSummary {
  inventoryId: string | null;
  productName: string | null;
  barcode: string | null;
  /** Quantity in shelf / invoice (sell) units — preferred for display. */
  displayQuantityReturned?: number | null;
  /** Smallest-stock-unit qty when auditing (optional). */
  baseQuantityReturned?: number | null;
  taxableValue: number | null;
  centralGstAmount: number | null;
  stateGstAmount: number | null;
  lineNoteValue: number | null;
}

/** One row from GET /vendor-purchase-returns (supplier return history). */
export interface VendorPurchaseReturnSummary {
  returnId: string;
  supplierCreditNoteNo: string;
  vendorPurchaseInvoiceId: string;
  invoiceNo: string | null;
  vendorName: string | null;
  returnAmount: number;
  totalLinesReturned: number;
  /** Per-line quantities and tax (empty when legacy records had no persisted lines). */
  lines?: VendorPurchaseReturnLineSummary[];
  reason: string | null;
  createdAt: string;
}

export interface GetVendorPurchaseReturnsParams {
  page?: number;
  limit?: number;
  /** Exact purchase invoice number on the vendor bill */
  invoiceNo?: string;
}

export interface VendorPurchaseReturnListDto {
  returns: VendorPurchaseReturnSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type InventoryCorrectionStatus =
  | 'PENDING'
  | 'PARTIALLY_APPROVED'
  | 'APPLIED'
  | 'REJECTED';

export type InventoryCorrectionLineStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface InventoryCorrectionLineRequest {
  inventoryId: string;
  requestedCurrentCount: number;
}

export interface CreateInventoryCorrectionRequest {
  vendorPurchaseInvoiceId?: string | null;
  invoiceNo?: string | null;
  vendorId?: string | null;
  vendorName?: string | null;
  note?: string | null;
  lines: InventoryCorrectionLineRequest[];
}

export interface InventoryCorrectionLine {
  lineId: string;
  inventoryId: string;
  productName: string | null;
  previousCurrentCount: number | null;
  previousCurrentBaseCount: number | null;
  requestedCurrentCount: number;
  requestedCurrentBaseCount: number | null;
  status: InventoryCorrectionLineStatus;
  processedAt: string | null;
  processedByUserId: string | null;
  rejectionReason: string | null;
}

export interface InventoryCorrection {
  id: string;
  vendorPurchaseInvoiceId: string | null;
  invoiceNo: string | null;
  vendorId: string | null;
  vendorName: string | null;
  status: InventoryCorrectionStatus;
  note: string | null;
  createdAt: string;
  createdByUserId: string | null;
  updatedAt: string | null;
  lines: InventoryCorrectionLine[];
}

export interface InventoryCorrectionListResponse {
  corrections: InventoryCorrection[];
  page: {
    page: number;
    size: number;
    totalItems: number;
    totalPages: number;
  };
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
  schemePayFor?: number | null;
  schemeFree?: number | null;
  schemeType?: SchemeType;
  schemePercentage?: number | null;
  purchaseSchemeType?: SchemeType | null;
  purchaseSchemePayFor?: number | null;
  purchaseSchemeFree?: number | null;
  purchaseSchemePercentage?: number | null;
  purchaseAdditionalDiscount?: number | null;
  sgst?: string | null;
  cgst?: string | null;
  saleAdditionalDiscount?: number | null;
  itemType?: ItemType;
  itemTypeDegree?: number;
  discountApplicable?: DiscountApplicable;
  billingMode?: BillingMode;
  purchaseDate?: string | null;
  baseUnit?: string | null;
  unitsPerPack?: number | null;
  unitConversions?: UnitConversion | null;
  rates?: Array<{ name: string; price: number }> | null;
  defaultRate?: string | null;
}

export interface ParseInvoiceResponse {
  items: ParseInvoiceItem[];
  totalItems: number;
  vendorPurchaseInvoice?: ParsedVendorInvoiceDto | null;
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
  vendorPurchaseInvoiceId?: string | null;
  hsn?: string | null;
  sac?: string | null;
  batchNo?: string | null;
  scheme?: number | null;
  schemePayFor?: number | null;
  schemeFree?: number | null;
  schemeType?: SchemeType;
  schemePercentage?: number | null;
  sgst?: string | null;
  cgst?: string | null;
  saleAdditionalDiscount?: number | null;
  createdAt?: string;
  itemType?: ItemType;
  itemTypeDegree?: number;
  discountApplicable?: DiscountApplicable;
  billingMode?: BillingMode;
  purchaseDate?: string;
  baseUnit?: string | null;
  uqc?: string | null;
  unitConversions?: UnitConversion | null;
  unitsPerPack?: number | null;
  packUnitUqc?: string | null;
  sellUnitRule?: SellUnitRule | null;
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
  /** From registration (cart only): additional discount % - read-only at sale */
  purchaseAdditionalDiscount?: number | null;
  /** From registration (cart only): scheme - read-only at sale */
  purchaseSchemeType?: SchemeType | null;
  purchaseSchemePayFor?: number | null;
  purchaseSchemeFree?: number | null;
  purchaseSchemePercentage?: number | null;
  /** Extension vertical fields merged from inventory_ext_* (batchNo, expiryDate, sport, …). */
  verticalFields?: Record<string, unknown> | null;
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
  saleAdditionalDiscount?: number | null;
  /** Purchase add. discount % from vendor */
  purchaseAdditionalDiscount?: number | null;
  /** Purchase scheme from vendor */
  purchaseSchemeType?: SchemeType | null;
  purchaseSchemePayFor?: number | null;
  purchaseSchemeFree?: number | null;
  purchaseSchemePercentage?: number | null;
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
  schemePayFor?: number | null;
  schemeFree?: number | null;
  schemePercentage?: number | null;
  baseUnit?: string | null;
  unitConversions?: UnitConversion | null;
  /** Extension vertical fields (batchNo, expiryDate, sport, …). */
  verticalFields?: Record<string, unknown> | null;
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

export interface InventoryExpiryBuckets {
  expired: number;
  expiringWithin7Days: number;
  expiringWithinSoonDays: number;
  expiringSoonTotal: number;
  totalWithExpiry: number;
  expiringSoonDays: number;
}

export interface InventorySearchParams {
  /** Single search box: name, barcode, batch 123, etc. */
  q?: string;
  sort?: string;
  limit?: number;
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
  /** Canonical line ref, e.g. {@code inventory:lotId} or {@code menu:itemId}. */
  sellableRef?: string;
  /** @deprecated use {@code sellableRef} with {@code inventory:…} prefix */
  id?: string;
  /** @deprecated use {@code sellableRef} with {@code menu:…} prefix */
  menuItemId?: string;
  unit?: string;
  quantity?: number;
  baseQuantity?: number;
  priceToRetail?: number;
  saleAdditionalDiscount?: number | null;
  // Scheme can be represented either as fixed units or percentage
  schemeType?: SchemeType | null;
  schemePercentage?: number | null;
  schemePayFor?: number | null;
  schemeFree?: number | null;
}

export interface CreateCheckoutDto {
  businessType: string;
  paymentMethod: PaymentMethod | string;
  /** Amount paid in cash now (new split-aware field). */
  cashAmount?: number;
  /** Amount paid online now (new split-aware field). */
  onlineAmount?: number;
  /** Amount that posts to the customer credit ledger (new split-aware field). */
  creditAmount?: number;
  items: CheckoutItem[];
}

export interface CheckoutItemResponse {
  sellableRef?: string | null;
  stockRef?: string | null;
  /** Derived from {@link sellableRef} / {@link stockRef} for legacy clients. */
  inventoryId?: string | null;
  /** Derived from {@link sellableRef} for legacy clients. */
  menuItemId?: string | null;
  sellMode?: 'menu' | 'direct' | 'sku' | null;
  /** Present when cart/checkout returns it; used to fetch full pricing/rates. */
  pricingId?: string | null;
  name: string;
  quantity: number;
  saleUnit?: string | null;
  baseUnit?: string | null;
  packUnitUqc?: string | null;
  baseQuantity?: number | null;
  unitFactor?: number | null;
  availableUnits?: AvailableUnit[] | null;
  maximumRetailPrice: number;
  priceToRetail: number;
  discount: number;
  saleAdditionalDiscount?: number | null;
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
  /** From registration: additional discount % (read-only at sale) */
  purchaseAdditionalDiscount?: number | null;
  /** From registration: scheme (read-only at sale) */
  purchaseSchemeType?: SchemeType | null;
  purchaseSchemePayFor?: number | null;
  purchaseSchemeFree?: number | null;
  purchaseSchemePercentage?: number | null;
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
  paymentMethod: PaymentMethod | string;
  /** Amount paid in cash now (split-aware). */
  cashAmount?: number | null;
  /** Amount paid online now (split-aware). */
  onlineAmount?: number | null;
  /** Amount posted to the credit ledger (split-aware). */
  creditAmount?: number | null;
  status: string;
  totalCost?: number | null;
  revenueBeforeTax?: number | null;
  revenueAfterTax?: number | null;
  totalProfit?: number | null;
  marginPercent?: number | null;
  billingMode?: BillingMode;
  creditEntryId?: string | null;
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
  saleAdditionalDiscountTotal: number;
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
  paymentMethod?: PaymentMethod | string;
  /** Amount paid in cash now (split-aware). Absent on legacy completed rows. */
  cashAmount?: number | null;
  /** Amount paid online now (split-aware). Absent on legacy completed rows. */
  onlineAmount?: number | null;
  /** Amount posted to the credit ledger (split-aware). Absent on legacy rows. */
  creditAmount?: number | null;
  totalCost?: number | null;
  revenueBeforeTax?: number | null;
  revenueAfterTax?: number | null;
  totalProfit?: number | null;
  marginPercent?: number | null;
  billingMode?: BillingMode;
  /** Present when checkout completion left a customer due in credit ledger. */
  creditEntryId?: string | null;
  /** Daily order token (cafe / menu-billing verticals). */
  tokenNo?: string | null;
}

export type CreditPartyType = 'VENDOR' | 'CUSTOMER';
export type CreditEntryType = 'CHARGE' | 'SETTLEMENT' | 'RETURN' | 'ADJUSTMENT';
export type CreditDirection = 'INCREASE_DUE' | 'DECREASE_DUE';
export type CreditBalanceStatus = 'CLEAR' | 'DUE' | 'ADVANCE';

export interface CreditAccountResponse {
  id: string;
  partyType: CreditPartyType;
  partyId: string;
  partyDisplayName: string;
  partyPhone?: string | null;
  currentBalance: number;
  status: CreditBalanceStatus;
  updatedAt?: string;
  lastEntryAt?: string;
}

export interface CreditEntryResponse {
  id: string;
  accountId: string;
  entryType: CreditEntryType;
  direction: CreditDirection;
  amount: number;
  balanceAfter: number;
  note?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  sourceKey?: string | null;
  paymentMethod?: string | null;
  bankRef?: string | null;
  txnDate?: string | null;
  createdByUserId?: string | null;
  createdAt: string;
}

export interface CreditEntriesPageResponse {
  entries: CreditEntryResponse[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

/** Tender used when posting a settlement (required on settlement API). */
export type CreditSettlementPaymentMethod =
  | 'CASH'
  | 'UPI'
  | 'BANK'
  | 'CARD'
  | 'ADJUSTMENT';

export interface CreateCreditEntryDto {
  partyType: CreditPartyType;
  partyId: string;
  partyDisplayName: string;
  partyPhone?: string;
  amount: number;
  note?: string;
  referenceType?: string;
  referenceId?: string;
  sourceKey?: string;
  /** Required for {@code POST /credit/settlement}. */
  paymentMethod?: CreditSettlementPaymentMethod;
  bankRef?: string;
  /** Business date (yyyy-mm-dd); defaults to today on the server. */
  txnDate?: string;
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
  /** Optional link to a registered StockKart user for this party. */
  customerUserId?: string;
}

export interface UpdateCartStatusDto {
  purchaseId: string;
  status: string;
  /** Canonical PaymentMethod (one of the 6 values). */
  paymentMethod: PaymentMethod | string;
  /** Amount paid in cash now (new split-aware field). */
  cashAmount?: number;
  /** Amount paid online now (new split-aware field). */
  onlineAmount?: number;
  /** Amount that posts to the customer credit ledger (new split-aware field). */
  creditAmount?: number;
  /**
   * Legacy paid-now amount on a CREDIT sale (the rest went to the ledger).
   * Kept for back-compat with older servers; new clients should send the
   * explicit cash/online/credit split.
   * @deprecated use `cashAmount`/`onlineAmount`/`creditAmount` instead.
   */
  creditPaidAmount?: number;
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
  paymentMethod: PaymentMethod | string;
  /** Amount paid in cash now (split-aware). Absent on legacy completed rows. */
  cashAmount?: number | null;
  /** Amount paid online now (split-aware). Absent on legacy completed rows. */
  onlineAmount?: number | null;
  /** Amount posted to the credit ledger (split-aware). Absent on legacy rows. */
  creditAmount?: number | null;
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
  reason?: string | null;
  paymentMethod: PaymentMethod | string;
  cashAmount?: number;
  onlineAmount?: number;
  creditAmount?: number;
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
  creditNoteNo?: string;
  purchaseId: string;
  refundedItems: RefundedItem[];
  refundAmount: number;
  totalItemsRefunded: number;
  createdAt: string;
}

export interface Refund {
  refundId: string;
  /** Display number for returns / GSTR-1 (e.g. CN-00001). */
  creditNoteNo?: string;
  purchaseId: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  refundAmount: number;
  totalItemsRefunded: number;
  /** Per SKU lines when stored on document (omit on very old refunds). */
  refundedItems?: RefundedItem[] | null;
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
  /** Optional. Links vendor to a registered user account. */
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
  /** PAN derived from GSTIN: 10 chars from 3rd character (1-based). */
  panNo?: string | null;
  /** Optional. Set when customer is linked to a registered user. */
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListResponse {
  data: CustomerResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateCustomerDto {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  dlNo?: string;
  pan?: string;
}

export interface UpdateCustomerDto {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  dlNo?: string;
  pan?: string;
}

export interface VendorListResponse {
  data: VendorResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UpdateVendorDto {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  companyName?: string;
  businessType?: string;
  gstinUin?: string;
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
  vendorPurchaseInvoice?: ParsedVendorInvoiceDto | null;
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

/** Scheme/deal (purchase or sale): schemeType, schemePayFor, schemeFree, schemePercentage */
export interface SchemeDto {
  schemeType?: string | null;
  schemePayFor?: number | null;
  schemeFree?: number | null;
  schemePercentage?: number | null;
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
  saleAdditionalDiscount?: number | null;
  /** Purchase add. discount % from vendor */
  purchaseAdditionalDiscount?: number | null;
  /** Purchase scheme/deal from vendor */
  purchaseScheme?: SchemeDto | null;
  /** Sale scheme/deal (e.g. 7+1) */
  saleScheme?: SchemeDto | null;
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

// GSTR-2 types (inward supplies)
export interface Gstr2B2bLineDto {
  supplierGstin?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  invoiceValue?: number;
  placeOfSupply?: string;
  reverseCharge?: string;
  invoiceType?: string;
  rate?: number;
  taxableValue?: number;
  integratedTaxPaid?: number;
  centralTaxPaid?: number;
  stateUtTaxPaid?: number;
  cessAmount?: number;
  itcEligibility?: string;
  availedItcIntegrated?: number;
  availedItcCentral?: number;
  availedItcStateUt?: number;
  availedItcCess?: number;
}

export interface Gstr2B2burLineDto {
  supplierName?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  invoiceValue?: number;
  placeOfSupply?: string;
  supplyType?: string;
  rate?: number;
  taxableValue?: number;
  integratedTaxPaid?: number;
  centralTaxPaid?: number;
  stateUtTaxPaid?: number;
  cessAmount?: number;
  itcEligibility?: string;
  availedItcIntegrated?: number;
  availedItcCentral?: number;
  availedItcStateUt?: number;
  availedItcCess?: number;
}

export interface Gstr2ImpsLineDto {
  invoiceNo?: string;
  invoiceDate?: string;
  invoiceValue?: number;
  placeOfSupply?: string;
  rate?: number;
  taxableValue?: number;
  integratedTaxPaid?: number;
  cessPaid?: number;
  itcEligibility?: string;
  availedItcIntegrated?: number;
  availedItcCess?: number;
}

export interface Gstr2ImpgLineDto {
  portCode?: string;
  billOfEntryNo?: string;
  billOfEntryDate?: string;
  billOfEntryValue?: number;
  documentType?: string;
  sezSupplierGstin?: string;
  rate?: number;
  taxableValue?: number;
  integratedTaxPaid?: number;
  cessPaid?: number;
  itcEligibility?: string;
  availedItcIntegrated?: number;
  availedItcCess?: number;
}

export interface Gstr2CdnrLineDto {
  supplierGstin?: string;
  noteNumber?: string;
  noteDate?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  preGst?: string;
  documentType?: string;
  reasonForIssuing?: string;
  supplyType?: string;
  noteValue?: number;
  rate?: number;
  taxableValue?: number;
  integratedTaxPaid?: number;
  centralTaxPaid?: number;
  stateUtTaxPaid?: number;
  cessPaid?: number;
  itcEligibility?: string;
  availedItcIntegrated?: number;
}

export interface Gstr2CdnurLineDto {
  noteNumber?: string;
  noteDate?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  preGst?: string;
  documentType?: string;
  reasonForIssuing?: string;
  supplyType?: string;
  invoiceType?: string;
  noteValue?: number;
  rate?: number;
  taxableValue?: number;
  integratedTaxPaid?: number;
  centralTaxPaid?: number;
  stateUtTaxPaid?: number;
  cessPaid?: number;
  itcEligibility?: string;
  availedItcIntegrated?: number;
}

export interface Gstr2AtLineDto {
  placeOfSupply?: string;
  rate?: number;
  grossAdvancePaid?: number;
  cessAmount?: number;
}

export interface Gstr2AtadjLineDto {
  placeOfSupply?: string;
  rate?: number;
  grossAdvanceToBeAdjusted?: number;
  cessAdjusted?: number;
}

export interface Gstr2ExempLineDto {
  description?: string;
  compositionTaxablePerson?: number;
  nilRatedSupplies?: number;
  exemptedOtherThanNilOrNonGst?: number;
  nonGstSupplies?: number;
}

export interface Gstr2ItcrLineDto {
  description?: string;
  toBeAddedOrReduced?: string;
  itcIntegratedTaxAmount?: number;
  itcCentralTaxAmount?: number;
  itcStateUtTaxAmount?: number;
  itcCessAmount?: number;
}

export interface Gstr2HsnLineDto {
  hsn?: string;
  description?: string;
  uqc?: string;
  totalQuantity?: number;
  totalValue?: number;
  rate?: number;
  taxableValue?: number;
  integratedTaxAmount?: number;
  centralTaxAmount?: number;
  stateUtTaxAmount?: number;
  cessAmount?: number;
}

export interface Gstr2TabDto<T> {
  lines: T[];
}

export interface Gstr2ReportResponse {
  shopId: string;
  shopGstin: string;
  period: string;
  year: number;
  month: number;
  b2b: Gstr2TabDto<Gstr2B2bLineDto>;
  b2bur: Gstr2TabDto<Gstr2B2burLineDto>;
  imps: Gstr2TabDto<Gstr2ImpsLineDto>;
  impg: Gstr2TabDto<Gstr2ImpgLineDto>;
  cdnr: Gstr2TabDto<Gstr2CdnrLineDto>;
  cdnur: Gstr2TabDto<Gstr2CdnurLineDto>;
  at: Gstr2TabDto<Gstr2AtLineDto>;
  atadj: Gstr2TabDto<Gstr2AtadjLineDto>;
  exemp: Gstr2TabDto<Gstr2ExempLineDto>;
  itcr: Gstr2TabDto<Gstr2ItcrLineDto>;
  hsnsum: Gstr2TabDto<Gstr2HsnLineDto>;
}

// GSTR-3B types
export interface Gstr3bSection31Dto {
  outwardTaxableValue?: number;
  outwardTaxableIgst?: number;
  outwardTaxableCgst?: number;
  outwardTaxableSgst?: number;
  outwardTaxableCess?: number;
  zeroRatedValue?: number;
  zeroRatedIgst?: number;
  nilExemptValue?: number;
  inwardRcmValue?: number;
  inwardRcmIgst?: number;
  inwardRcmCgst?: number;
  inwardRcmSgst?: number;
  inwardRcmCess?: number;
  nonGstValue?: number;
}

export interface Gstr3bInterStateSupplyDto {
  placeOfSupply?: string;
  taxableValue?: number;
  integratedTax?: number;
}

export interface Gstr3bSection4Dto {
  itcOtherIgst?: number;
  itcOtherCgst?: number;
  itcOtherSgst?: number;
  itcReversedOthersIgst?: number;
  itcReversedOthersCgst?: number;
  itcReversedOthersSgst?: number;
}

export interface Gstr3bSection5Dto {
  compExemptInterState?: number;
  compExemptIntraState?: number;
  nonGstInterState?: number;
  nonGstIntraState?: number;
}

export interface Gstr3bSection61Dto {
  igstPayable?: number;
  igstPaidByItc?: number;
  igstPaidByCash?: number;
  cgstPayable?: number;
  cgstPaidByItcIgst?: number;
  cgstPaidByItcCgst?: number;
  cgstPaidByItcSgst?: number;
  cgstPaidByCash?: number;
  sgstPayable?: number;
  sgstPaidByItcIgst?: number;
  sgstPaidByItcCgst?: number;
  sgstPaidByItcSgst?: number;
  sgstPaidByCash?: number;
  cessPayable?: number;
}

export interface Gstr3bReportResponse {
  shopId: string;
  shopGstin: string;
  legalName: string;
  period: string;
  year: number;
  month: number;
  section31?: Gstr3bSection31Dto;
  interStateSupplies?: Gstr3bInterStateSupplyDto[];
  section4?: Gstr3bSection4Dto;
  section5?: Gstr3bSection5Dto;
  section61?: Gstr3bSection61Dto;
}

// Accounting module --------------------------------------------------------

export type AccountType =
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'REVENUE'
  | 'EXPENSE';

export type NormalBalance = 'DEBIT' | 'CREDIT';

export type AccountingPartyType = 'CUSTOMER' | 'VENDOR' | 'SHOP';

export type JournalSource =
  | 'OPENING_BALANCE'
  | 'VENDOR_PURCHASE_INVOICE'
  | 'VENDOR_PURCHASE_RETURN'
  | 'SALE'
  | 'SALES_RETURN'
  | 'CUSTOMER_SETTLEMENT'
  | 'VENDOR_PAYMENT'
  | 'INVENTORY_CORRECTION'
  | 'MANUAL'
  | 'REVERSAL';

export type JournalStatus = 'POSTED' | 'REVERSED' | 'VOID';

export interface AccountResponse {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  parentCode?: string | null;
  system: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAccountRequest {
  code: string;
  name: string;
  type: AccountType;
  normalBalance?: NormalBalance;
}

export interface UpdateAccountRequest {
  name?: string;
  active?: boolean;
}

export interface JournalLineResponse {
  lineIndex: number;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  partyType?: AccountingPartyType | null;
  partyRefId?: string | null;
  partyDisplayName?: string | null;
  memo?: string | null;
}

export interface JournalEntryResponse {
  id: string;
  entryNo: string;
  txnDate: string;
  postedAt: string;
  sourceType: JournalSource;
  sourceId?: string | null;
  status: JournalStatus;
  reversesEntryId?: string | null;
  reversedByEntryId?: string | null;
  narration?: string | null;
  lines: JournalLineResponse[];
  totalDebit: number;
  totalCredit: number;
  createdByUserId?: string | null;
}

export interface JournalEntriesPageResponse {
  entries: JournalEntryResponse[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface CreateJournalLineRequest {
  accountCode?: string;
  accountId?: string;
  debit?: number;
  credit?: number;
  partyType?: AccountingPartyType;
  partyRefId?: string;
  partyDisplayName?: string;
  memo?: string;
}

export interface CreateJournalEntryRequest {
  txnDate?: string;
  narration?: string;
  lines: CreateJournalLineRequest[];
}

export interface ReverseJournalRequest {
  reason?: string;
}

export interface LedgerEntryResponse {
  id: string;
  journalEntryId: string;
  journalEntryNo: string;
  sourceType: JournalSource;
  sourceId?: string | null;
  txnDate: string;
  postedAt: string;
  debit: number;
  credit: number;
  balanceAfter: number;
  partyType?: AccountingPartyType | null;
  partyRefId?: string | null;
  partyDisplayName?: string | null;
  narration?: string | null;
}

export interface LedgerPageResponse {
  account: AccountResponse;
  entries: LedgerEntryResponse[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  normalBalance: NormalBalance;
  debitTurnover: number;
  creditTurnover: number;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalanceResponse {
  asOf: string;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
}

export interface BackfillResult {
  processed: number;
  posted: number;
  /** Re-posted invoices (only non-zero when force=true was passed). */
  reposted: number;
  skipped: number;
  failed: number;
}

export interface FinancialReportLineDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  amount: number;
}

export interface ProfitAndLossResponse {
  from: string;
  to: string;
  revenueLines: FinancialReportLineDto[];
  expenseLines: FinancialReportLineDto[];
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
}

export interface BalanceSheetResponse {
  asOf: string;
  assets: FinancialReportLineDto[];
  liabilities: FinancialReportLineDto[];
  equity: FinancialReportLineDto[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  imbalance: number;
}

export interface OpeningBalanceRequest {
  txnDate?: string;
  narration?: string;
  lines: CreateJournalLineRequest[];
}

export interface PartySummaryRow {
  partyType: AccountingPartyType;
  partyRefId: string;
  partyDisplayName: string | null;
  debitTurnover: number;
  creditTurnover: number;
  /** Positive = we owe vendor (VENDOR) / customer owes us (CUSTOMER). */
  balance: number;
  lastTxnDate: string | null;
  txnCount: number;
}

export interface PartySummariesResponse {
  partyType: AccountingPartyType;
  from: string | null;
  to: string | null;
  asOf: string;
  parties: PartySummaryRow[];
  totalDebit: number;
  totalCredit: number;
  totalBalance: number;
}

export interface PartyStatementEntryResponse {
  id: string;
  journalEntryId: string;
  journalEntryNo: string;
  sourceType: JournalSource;
  sourceId: string | null;
  txnDate: string;
  postedAt: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  /** Party-oriented running balance after this entry. */
  balanceAfter: number;
  narration: string | null;
}

export interface PartyStatementResponse {
  partyType: AccountingPartyType;
  partyRefId: string;
  partyDisplayName: string | null;
  openingBalance: number;
  closingBalance: number;
  entries: PartyStatementEntryResponse[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
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
