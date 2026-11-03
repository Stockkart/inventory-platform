// Pricing API types
import type { PricingRate } from '@inventory-platform/contracts';

export type {
  PricingRate,
  PricingRateWarning,
  PricingResponse,
} from '@inventory-platform/contracts';

export interface PatchPricingDto {
  maximumRetailPrice?: number;
  priceToRetail?: number;
  rates?: PricingRate[];
  defaultRate?: string;
  /** Rule rate names to regenerate from their rule (needs the rate rules edit grant). */
  resetRates?: string[];
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

export interface SchemeDto {
  schemeType?: string | null;
  schemePayFor?: number | null;
  schemeFree?: number | null;
  schemePercentage?: number | null;
}
