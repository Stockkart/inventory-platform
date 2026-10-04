import type { LabelSourceGroup, LabelValueType } from '../model/labelLayout.types';
import {
  CARD_SURFACE_IDS,
  DEFAULT_CARD_OPTIONS,
  type CardEmphasis,
  type CardSurfaceId,
  type CardVariant,
  type FieldSensitivity,
  type ResolvedCardField,
  type ResolvedCardLayout,
  type ResolvedCardSection,
} from '../model/cardLayout.types';

/**
 * Frontend copies of the built-in layouts, already in resolved shape (configurable-product-card
 * Req 6.1–6.3, 7.11). Cards render from these while the layouts query is pending or failed, so a
 * search page is never blocked on settings. They must match `CardLayoutDefaults` /
 * `CafeCardSurfaceContributor` on the backend — the default-parity tests pin both to today's cards.
 */

interface StaticFieldMeta {
  label: string;
  valueType: LabelValueType;
  sourceGroup: LabelSourceGroup;
  itemPath: string;
  sensitivity?: FieldSensitivity;
}

/** Catalog metadata for the fields the defaults use. Labels are the catalog labels. */
const META: Record<string, StaticFieldMeta> = {
  companyName: { label: 'Company', valueType: 'text', sourceGroup: 'product', itemPath: 'companyName' },
  barcodeText: { label: 'Barcode', valueType: 'text', sourceGroup: 'product', itemPath: 'barcode' },
  batchNo: { label: 'Batch no.', valueType: 'text', sourceGroup: 'lot', itemPath: 'batchNo' },
  location: { label: 'Location', valueType: 'text', sourceGroup: 'lot', itemPath: 'location' },
  availableCount: { label: 'Available', valueType: 'number', sourceGroup: 'lot', itemPath: 'availableCount' },
  currentCount: { label: 'Current stock', valueType: 'number', sourceGroup: 'lot', itemPath: 'currentCount' },
  receivedCount: { label: 'Received', valueType: 'number', sourceGroup: 'lot', itemPath: 'receivedCount' },
  soldCount: { label: 'Sold', valueType: 'number', sourceGroup: 'lot', itemPath: 'soldCount' },
  thresholdCount: { label: 'Low-stock threshold', valueType: 'number', sourceGroup: 'lot', itemPath: 'thresholdCount' },
  expiryDate: { label: 'Expiry', valueType: 'date', sourceGroup: 'lot', itemPath: 'expiryDate' },
  purchaseDate: { label: 'Purchased on', valueType: 'date', sourceGroup: 'lot', itemPath: 'purchaseDate' },
  sellingPrice: { label: 'Selling price', valueType: 'currency', sourceGroup: 'pricing', itemPath: 'sellingPrice' },
  mrp: { label: 'MRP', valueType: 'currency', sourceGroup: 'pricing', itemPath: 'maximumRetailPrice' },
  costPrice: { label: 'Cost price', valueType: 'currency', sourceGroup: 'pricing', itemPath: 'costPrice', sensitivity: 'SHOP_INTERNAL' },
  saleAdditionalDiscount: { label: 'Additional discount', valueType: 'percentage', sourceGroup: 'pricing', itemPath: 'saleAdditionalDiscount' },
};

function f(fieldKey: string, labelOverride?: string, emphasis: CardEmphasis = 'NORMAL'): ResolvedCardField {
  const meta = META[fieldKey];
  if (!meta) throw new Error(`No default metadata for card field ${fieldKey}`);
  return {
    fieldKey,
    label: labelOverride ?? meta.label,
    showLabel: true,
    emphasis,
    valueType: meta.valueType,
    sourceGroup: meta.sourceGroup,
    itemPath: meta.itemPath,
    schemaApiKey: null,
    sensitivity: meta.sensitivity ?? 'PUBLIC',
  };
}

function section(id: string, dividerAbove: boolean, rows: ResolvedCardField[][]): ResolvedCardSection {
  return { id, title: null, dividerAbove, rows: rows.map((fields) => ({ fields })) };
}

const PRODUCT_SEARCH: ResolvedCardLayout = {
  sections: [
    section('identity', false, [[f('companyName')], [f('batchNo', 'Batch')], [f('barcodeText', 'Barcode')], [f('location')]]),
    section('stock', true, [[f('availableCount')], [f('receivedCount'), f('soldCount')]]),
    section('pricing', false, [
      [f('sellingPrice', 'Selling Price', 'STRONG')],
      [f('mrp', undefined, 'STRONG')],
      [f('saleAdditionalDiscount', 'Additional Discount', 'STRONG')],
    ]),
    section('dates', false, [[f('expiryDate', 'Expires')], [f('purchaseDate', 'Purchased')]]),
  ],
  options: DEFAULT_CARD_OPTIONS,
};

const SCAN_SELL: ResolvedCardLayout = {
  sections: [
    section('identity', false, [
      [f('companyName')],
      [f('batchNo', 'Batch')],
      [f('barcodeText', 'Barcode')],
      [f('availableCount')],
      [f('mrp', undefined, 'STRONG')],
      [f('sellingPrice', 'Selling', 'STRONG')],
      [f('expiryDate', 'Expires', 'STRONG')],
    ]),
  ],
  options: { blankValueBehavior: 'HIDE_LINE', showAttributeChips: false, showDescription: false },
};

const CAFE_INGREDIENT_SEARCH: ResolvedCardLayout = {
  sections: [
    section('identity', false, [[f('companyName')], [f('barcodeText')], [f('location')]]),
    section('stock', true, [
      [f('currentCount', 'Current')],
      [f('receivedCount'), f('soldCount', 'Used')],
      [f('thresholdCount', 'Threshold')],
    ]),
    section('pricing', false, [[f('costPrice', 'Cost', 'STRONG')], [f('sellingPrice', 'Selling Price', 'STRONG')]]),
    section('dates', false, [[f('purchaseDate', 'Purchased')]]),
  ],
  options: DEFAULT_CARD_OPTIONS,
};

export const EMPTY_CARD_LAYOUT: ResolvedCardLayout = { sections: [], options: DEFAULT_CARD_OPTIONS };

export const FALLBACK_CARD_LAYOUTS: Record<CardSurfaceId, Record<CardVariant, ResolvedCardLayout>> = {
  [CARD_SURFACE_IDS.productSearch]: { REGULAR: PRODUCT_SEARCH, BASIC: PRODUCT_SEARCH },
  [CARD_SURFACE_IDS.scanSell]: { REGULAR: SCAN_SELL, BASIC: SCAN_SELL },
  [CARD_SURFACE_IDS.cafeIngredientSearch]: { REGULAR: CAFE_INGREDIENT_SEARCH, BASIC: CAFE_INGREDIENT_SEARCH },
};

export function fallbackLayoutFor(surfaceId: string, variant: CardVariant): ResolvedCardLayout {
  const bySurface = (FALLBACK_CARD_LAYOUTS as Record<string, Record<CardVariant, ResolvedCardLayout>>)[surfaceId];
  return bySurface?.[variant] ?? EMPTY_CARD_LAYOUT;
}
