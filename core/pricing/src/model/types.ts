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

