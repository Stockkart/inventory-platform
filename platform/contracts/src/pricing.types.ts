export interface PricingRate {
  name: string;
  price: number;
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
