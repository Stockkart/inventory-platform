import {
  hydrateExtensionFieldsOnProduct,
  type VerticalSchemaFieldDef,
} from '@inventory-platform/schema';
import type { InventoryItem, PurchaseSchemeInputType } from '../model/types';

/** Form row shape used by product registration (subset needed for prefill mapping). */
export type RegistrationPrefillProduct = {
  count?: number;
  location?: string;
  maximumRetailPrice?: number | string;
  costPrice?: number | string;
  priceToRetail?: number | string;
  price?: number;
  sellingPrice?: number | string;
  rates?: InventoryItem['rates'];
  defaultRate?: string;
  saleAdditionalDiscount?: number | null;
  sgst?: string;
  cgst?: string;
  discountApplicable?: InventoryItem['discountApplicable'];
  billingMode?: InventoryItem['billingMode'];
  schemeType?: InventoryItem['schemeType'];
  scheme?: number | null;
  schemePayFor?: number | null;
  schemeFree?: number | null;
  schemePercentage?: number | null;
  purchaseSchemeType?: PurchaseSchemeInputType;
  purchaseSchemePayFor?: number | null;
  purchaseSchemeFree?: number | null;
  purchaseSchemePercentage?: number | null;
  purchaseSchemeFreeQty?: number | null;
  purchaseAdditionalDiscount?: number | null;
  batchNo?: string;
  expiryDate?: string;
  purchaseDate?: string;
  verticalFields?: Record<string, unknown>;
};

function formatDateForForm(value: string | null | undefined): string {
  if (!value?.trim()) {
    return '';
  }
  return value.slice(0, 10);
}

function extensionString(detail: InventoryItem, key: string): string {
  const fromBag = detail.verticalFields?.[key];
  if (fromBag != null && fromBag !== '') {
    return String(fromBag);
  }
  const legacy = (detail as Record<string, unknown>)[key];
  if (legacy != null && legacy !== '') {
    return String(legacy);
  }
  return '';
}

function resolveRegistrationCount(detail: InventoryItem): number {
  const received = detail.receivedCount;
  if (received != null && Number.isFinite(Number(received)) && Number(received) > 0) {
    return Math.trunc(Number(received));
  }
  return 0;
}

/**
 * Map the latest inventory lot for a catalog product into registration form fields.
 * Quantity is copied from the last stock-in's received count as a starting point.
 */
export function mapLastInventoryToRegistrationPatch(
  detail: InventoryItem,
  registrationFields: VerticalSchemaFieldDef[],
): Partial<RegistrationPrefillProduct> {
  const packFactor = detail.unitConversions?.factor ?? detail.unitsPerPack ?? undefined;
  const batchNo = extensionString(detail, 'batchNo') || detail.batchNo || '';
  const expiryDate =
    formatDateForForm(extensionString(detail, 'expiryDate')) ||
    formatDateForForm(detail.expiryDate);

  const patch: RegistrationPrefillProduct & Record<string, unknown> = {
    location: detail.location ?? '',
    maximumRetailPrice: detail.maximumRetailPrice ?? 0,
    costPrice: detail.costPrice ?? 0,
    priceToRetail: detail.priceToRetail ?? 0,
    price: detail.priceToRetail ?? 0,
    sellingPrice: detail.sellingPrice ?? detail.priceToRetail ?? 0,
    rates: detail.rates ?? [],
    defaultRate: detail.defaultRate ?? '',
    saleAdditionalDiscount: detail.saleAdditionalDiscount ?? null,
    sgst: detail.sgst ?? '',
    cgst: detail.cgst ?? '',
    discountApplicable: detail.discountApplicable,
    billingMode: detail.billingMode,
    schemeType: detail.schemeType ?? 'FIXED_UNITS',
    scheme: detail.scheme ?? null,
    schemePayFor: detail.schemePayFor ?? null,
    schemeFree: detail.schemeFree ?? null,
    schemePercentage: detail.schemePercentage ?? null,
    purchaseSchemeType: (detail.purchaseSchemeType ?? 'FIXED_UNITS') as PurchaseSchemeInputType,
    purchaseSchemePayFor: detail.purchaseSchemePayFor ?? null,
    purchaseSchemeFree: detail.purchaseSchemeFree ?? null,
    purchaseSchemePercentage: detail.purchaseSchemePercentage ?? null,
    purchaseAdditionalDiscount: detail.purchaseAdditionalDiscount ?? null,
    count: resolveRegistrationCount(detail),
    batchNo,
    expiryDate,
    purchaseDate: formatDateForForm(detail.purchaseDate),
    ...(packFactor != null && packFactor > 0
      ? { unitsPerPack: packFactor, conversionFactor: packFactor }
      : {}),
    verticalFields: detail.verticalFields ? { ...detail.verticalFields } : undefined,
  };

  return hydrateExtensionFieldsOnProduct(patch, registrationFields);
}
