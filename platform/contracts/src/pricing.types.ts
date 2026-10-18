/** The price a rate rule starts from, as the API names it. */
export type RateRuleBase = 'sellingPrice' | 'priceToRetail' | 'maximumRetailPrice';

/** Scheme kinds the API sends on a rate: fixed free units (10+1) or a percentage. */
export type RateSchemeType = 'FIXED_UNITS' | 'PERCENTAGE';

export interface PricingRate {
  name: string;
  price: number;
  /** Rule-derived rate fields; absent on legacy hand-typed rates. All computed by the API. */
  base?: RateRuleBase | null;
  baseValue?: number | null;
  discountPercent?: number | null;
  scheme?: {
    schemeType?: RateSchemeType | null;
    schemePayFor?: number | null;
    schemeFree?: number | null;
    schemePercentage?: number | null;
  } | null;
  manual?: boolean | null;
  gstMode?: string | null;
  termsText?: string | null;
}

/** A rate a save left below cost or did not generate; `reason` is a code such as BELOW_COST. */
export interface PricingRateWarning {
  name: string;
  reason: string;
}

export interface PricingResponse {
  id: string;
  shopId?: string;
  priceToRetail: number;
  maximumRetailPrice?: number;
  costPrice?: number;
  rates?: PricingRate[];
  defaultRate?: string;
  /**
   * Names `defaultRate` may take, in display order: priceToRetail, maximumRetailPrice,
   * costPrice, then the eligible rates. Decided by the API.
   */
  defaultRateOptions?: string[] | null;
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
  /** Set by PATCH only: rates left below cost by this save. */
  warnings?: PricingRateWarning[] | null;
  createdAt?: string;
  updatedAt?: string;
}
