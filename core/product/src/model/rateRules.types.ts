import type { PricingRate } from '@inventory-platform/contracts';

/** Scheme a rate rule applies on top of its base value. Server-owned shape. */
export interface RateRuleScheme {
  schemeType?: string | null;
  schemePayFor?: number | null;
  schemeFree?: number | null;
  schemePercentage?: number | null;
}

/** One shop rate rule: a named rate derived from a base price by the backend. */
export interface RateRule {
  name: string;
  base: string;
  discountPercent?: number | null;
  scheme?: RateRuleScheme | null;
}

/** GET /shops/active-shop/rate-rules */
export interface RateRulesResponse {
  enabled: boolean;
  canEdit: boolean;
  baseOptions: string[];
  rules: RateRule[];
}

/** PUT /shops/active-shop/rate-rules */
export interface UpdateRateRulesRequest {
  rules: RateRule[];
}

/** POST /shops/active-shop/rate-rules/preview: raw cost inputs; the backend does the maths. */
export interface RateRulesPreviewRequest {
  sellingPrice?: number | null;
  priceToRetail?: number | null;
  maximumRetailPrice?: number | null;
  costPrice?: number | null;
  costPriceIncludesTax?: boolean | null;
  purchaseAdditionalDiscount?: number | null;
  purchaseScheme?: RateRuleScheme | null;
  sgst?: string | null;
  cgst?: string | null;
  /** Unsaved draft rules; omit to preview the saved rules. */
  rules?: RateRule[];
}

export interface RateRulePreviewRate extends PricingRate {
  afterDiscount?: number | null;
}

export interface RateRulePreviewSkipped {
  name: string;
  reason: string;
}

export interface RateRulesPreviewResponse {
  rates: RateRulePreviewRate[];
  skipped: RateRulePreviewSkipped[];
}
