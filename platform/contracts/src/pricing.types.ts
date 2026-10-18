export interface PricingRate {
  name: string;
  price: number;
  /** Rule-derived rate fields; absent on legacy hand-typed rates. All computed by the API. */
  base?: string | null;
  baseValue?: number | null;
  discountPercent?: number | null;
  scheme?: {
    schemeType?: string | null;
    schemePayFor?: number | null;
    schemeFree?: number | null;
    schemePercentage?: number | null;
  } | null;
  manual?: boolean | null;
  gstMode?: string | null;
  termsText?: string | null;
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
  purchaseAdditionalDiscount?: number | null;
  purchaseScheme?: {
    schemeType?: string | null;
    schemePayFor?: number | null;
    schemeFree?: number | null;
    schemePercentage?: number | null;
  } | null;
  saleScheme?: {
    schemeType?: string | null;
    schemePayFor?: number | null;
    schemeFree?: number | null;
    schemePercentage?: number | null;
  } | null;
  sgst?: string | null;
  cgst?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
