import type {
  PaymentMethod,
  CustomReminderInput,
  PricingRate,
  PageMeta,
} from '@inventory-platform/contracts';

// Inventory types
export type ItemType = 'NORMAL' | 'COSTLY' | 'DEGREE';
export type DiscountApplicable = 'DISCOUNT' | 'SCHEME' | 'DISCOUNT_AND_SCHEME';

export type SchemeType = 'FIXED_UNITS' | 'PERCENTAGE';
/** Purchase registration: free units on top of billable count (UI; persisted as FIXED_UNITS + ratio). */
export type PurchaseSchemeInputType = SchemeType | 'FREE_QUANTITY';
export type BillingMode = 'REGULAR' | 'BASIC';

/** SALE cart/invoice vs ESTIMATE quote document. Orthogonal to BillingMode. */
export type DocumentType = 'SALE' | 'ESTIMATE';

export type EstimateState = 'OPEN' | 'CONVERTED' | 'DISCARDED';

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

/** Shop-scoped catalog identity returned by product suggest / get-by-id (prefill source). */
export interface ProductSuggestion {
  id: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  companyName?: string | null;
  businessType?: string | null;
  itemType?: ItemType | null;
  itemTypeDegree?: number | null;
  baseUnit?: string | null;
  unitConversions?: UnitConversion | null;
  hsn?: string | null;
}

export interface CreateInventoryDto {
  /** Existing catalog product selected in the UI; server reuses or forks on identity edits. */
  productId?: string;
  barcode?: string;
  name: string;
  companyName: string;
  price: number;
  maximumRetailPrice: number;
  costPrice: number;
  priceToRetail: number;
  /** Reference sell price for resale ingredients (cafe simple pricing). */
  sellingPrice?: number;
  businessType: string;
  location: string;
  count: number;
  /** Optional; medical stores expiry in verticalFields when schema uses extension storage. */
  expiryDate?: string;
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
  /** Existing catalog product selected in the UI; server reuses or forks on identity edits. */
  productId?: string;
  barcode?: string;
  name: string;
  description?: string;
  companyName: string;
  maximumRetailPrice: number;
  costPrice: number;
  priceToRetail: number;
  sellingPrice?: number;
  businessType: string;
  location: string;
  count: number;
  thresholdCount?: number;
  /** Core expiry (omit when schema stores expiry in verticalFields). */
  expiryDate?: string;
  reminderAt?: string;
  customReminders?: CustomReminderInput[] | null;
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

export type InventoryCorrectionStatus = 'PENDING' | 'PARTIALLY_APPROVED' | 'APPLIED' | 'REJECTED';

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
  /** Optional; medical expiry often lives in verticalFields instead of core. */
  expiryDate?: string;
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
  /** Extension field filters, e.g. sellDirect=true */
  filters?: Record<string, string>;
  /**
   * Sold-out lots are returned unless this is false. Selling screens pass false; stock
   * correction and pricing screens need the sold-out lots and leave it alone.
   */
  includeZeroStock?: boolean;
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
  documentType?: DocumentType | null;
  estimateState?: EstimateState | null;
  estimateNo?: string | null;
  convertedToPurchaseId?: string | null;
  sourceEstimateId?: string | null;
}

export interface AddToCartDto {
  businessType: string;
  items: CheckoutItem[];
  purchaseId?: string;
  createNewQuotation?: boolean;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerGstin?: string;
  customerDlNo?: string;
  customerPan?: string;
  customerId?: string;
  customerPartyType?: string;
  /** Optional link to a registered StockKart user for this party. */
  customerUserId?: string;
}

export interface CreateQuotationDto {
  businessType: string;
  customerId?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerGstin?: string;
  customerDlNo?: string;
  customerPan?: string;
  customerPartyType?: string;
  customerUserId?: string;
}

export interface CreateEstimateDto {
  businessType: string;
  customerId?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerGstin?: string;
  customerDlNo?: string;
  customerPan?: string;
  customerPartyType?: string;
  customerUserId?: string;
}

export interface QuotationSummary {
  purchaseId: string;
  status: string;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  /** Daily order token (cafe). */
  tokenNo?: string | null;
  itemCount: number;
  grandTotal: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuotationListResponse {
  quotations: QuotationSummary[];
}

export interface EstimateSummary {
  purchaseId: string;
  estimateNo?: string | null;
  status: string;
  estimateState: EstimateState;
  billingMode?: BillingMode | null;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  itemCount: number;
  grandTotal: number;
  convertedToPurchaseId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EstimateListResponse {
  estimates: EstimateSummary[];
  page?: number;
  size?: number;
  total?: number;
  totalPages?: number;
}

export interface ConvertEstimateResponse {
  estimateId: string;
  estimateNo?: string | null;
  salePurchaseId: string;
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
  /**
   * Free text matched against a customer's name, phone, email or address.
   *
   * This is the one box the counter types into. There are no separate name,
   * phone or email parameters: the person typing should not have to say which
   * of the four they are holding, and an exact name would reach almost no party
   * anyway -- one is entered as its trading name and stored with its town
   * appended.
   */
  customer?: string;
  invoiceNo?: string;
  /** Inclusive first sale date, yyyy-MM-dd. */
  from?: string;
  /** Inclusive last sale date, yyyy-MM-dd. */
  to?: string;
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

export interface CustomerProductSaleEntry {
  soldAt: string;
  invoiceNo: string;
  purchaseId: string;
  quantity: number;
  priceToRetail: number;
  lineTotal: number;
  saleAdditionalDiscount?: number | null;
  schemeType?: 'FIXED_UNITS' | 'PERCENTAGE' | null;
  schemePayFor?: number | null;
  schemeFree?: number | null;
  schemePercentage?: number | null;
}

export interface CustomerProductHistoryGroup {
  lastSale: CustomerProductSaleEntry | null;
  history: CustomerProductSaleEntry[];
}

export interface CustomerProductHistoryResponse {
  bySellableRef: Record<string, CustomerProductHistoryGroup>;
}

export interface GetCustomerProductHistoryParams {
  customerId?: string;
  customerPhone?: string;
  sellableRefs: string[];
  limit?: number;
  excludePurchaseId?: string;
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

/** Shop barcode pool / label types. */
export type BarcodePoolStatus = 'UNUSED' | 'ATTACHED';

export interface BarcodePoolItem {
  id: string;
  code: string;
  status: BarcodePoolStatus;
  productId?: string | null;
  batchId?: string | null;
  labelName?: string | null;
  labelCompany?: string | null;
  labelPrice?: number | null;
  createdAt?: string | null;
}

export interface GenerateBarcodesRequest {
  count?: number;
  batchId?: string;
}

export interface GenerateBarcodesResponse {
  items: BarcodePoolItem[];
}

export interface BarcodePoolListResponse {
  items: BarcodePoolItem[];
}

export interface AttachBarcodeRequest {
  productId: string;
}

export interface BarcodeLabelsRequest {
  productIds?: string[];
  codes?: string[];
}

export interface BarcodeLabelDto {
  code: string;
  name?: string | null;
  companyName?: string | null;
  price?: number | null;
  productId?: string | null;
}
