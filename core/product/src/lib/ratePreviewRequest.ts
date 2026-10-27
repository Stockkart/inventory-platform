import type { RateRulesPreviewRequest } from '../model/rateRules.types';

/** The slice of a product entry row the rate preview reads. */
export interface RatePreviewSource {
  sellingPrice?: number | string;
  priceToRetail?: number | string;
  maximumRetailPrice?: number | string;
  costPrice?: number | string;
  purchaseAdditionalDiscount?: number | null;
  purchaseSchemeType?: string | null;
  purchaseSchemePayFor?: number | null;
  purchaseSchemeFree?: number | null;
  purchaseSchemePercentage?: number | null;
  sgst?: string;
  cgst?: string;
}

/** Reads a typed price: blank or non-numeric becomes null. */
function typedMoney(v: number | string | undefined): number | null {
  if (v === '' || v == null) return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Raw form values for the rate preview. The server works out every rate; this only reads the
 * numbers the user typed and passes the purchase terms through. `costIncludesTax` is the bill's
 * server-resolved tax treatment (INCLUSIVE), the same input the save uses.
 */
export function ratePreviewRequest(
  product: RatePreviewSource,
  costIncludesTax: boolean,
): RateRulesPreviewRequest {
  const percentage = (product.purchaseSchemeType ?? 'FIXED_UNITS') === 'PERCENTAGE';
  const hasScheme = percentage
    ? product.purchaseSchemePercentage != null
    : product.purchaseSchemePayFor != null || product.purchaseSchemeFree != null;
  return {
    sellingPrice: typedMoney(product.sellingPrice),
    priceToRetail: typedMoney(product.priceToRetail),
    maximumRetailPrice: typedMoney(product.maximumRetailPrice),
    costPrice: typedMoney(product.costPrice),
    costPriceIncludesTax: costIncludesTax,
    purchaseAdditionalDiscount: product.purchaseAdditionalDiscount ?? null,
    purchaseScheme: hasScheme
      ? percentage
        ? { schemeType: 'PERCENTAGE', schemePercentage: product.purchaseSchemePercentage }
        : {
            schemeType: 'FIXED_UNITS',
            schemePayFor: product.purchaseSchemePayFor,
            schemeFree: product.purchaseSchemeFree,
          }
      : null,
    sgst: product.sgst?.trim() || null,
    cgst: product.cgst?.trim() || null,
  };
}
