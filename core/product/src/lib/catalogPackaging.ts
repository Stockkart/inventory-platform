import type { ProductSuggestion } from '../model/types';

/**
 * Packaging of the catalog product that owns a row's barcode. The server always registers stock
 * against that product's packaging, so the row's pack factor must match it.
 */
export interface CatalogPackaging {
  productId: string;
  productName: string;
  barcode: string;
  baseUnit: string;
  /** Base units per pack; 0 when the product has no pack conversion. */
  unitsPerPack: number;
  packUnit: string | null;
}

export function catalogPackagingFromProduct(product: ProductSuggestion): CatalogPackaging | null {
  const barcode = product.barcode?.trim();
  if (!barcode) return null;
  const factor = product.unitConversions?.factor ?? 0;
  return {
    productId: product.id,
    productName: product.name,
    barcode,
    baseUnit: product.baseUnit?.trim() ?? '',
    unitsPerPack: factor > 0 ? factor : 0,
    packUnit: product.unitConversions?.unit?.trim() || null,
  };
}

function effectivePackFactor(unitsPerPack: number | string | null | undefined): number {
  const n = Number(unitsPerPack);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

/** True while the row still carries the barcode that ties it to the catalog product. */
export function isCatalogPackagingActive(
  row: { barcode?: string | null },
  catalog: CatalogPackaging | null | undefined,
): catalog is CatalogPackaging {
  return catalog != null && (row.barcode?.trim() ?? '') === catalog.barcode;
}

export function rowMatchesCatalogPackaging(
  unitsPerPack: number | string | null | undefined,
  catalog: CatalogPackaging,
): boolean {
  return effectivePackFactor(unitsPerPack) === effectivePackFactor(catalog.unitsPerPack);
}

/** e.g. {@code 1 × 60 PAC} or {@code BTL}. */
export function describeCatalogPackaging(catalog: CatalogPackaging): string {
  if (catalog.unitsPerPack > 1) {
    return `1 × ${catalog.unitsPerPack} ${catalog.baseUnit || catalog.packUnit || ''}`.trim();
  }
  return catalog.baseUnit || 'no pack size';
}

/** Row fields that make the form's packaging match the catalog product. */
export function catalogPackagingPatch(catalog: CatalogPackaging) {
  return {
    baseUnit: catalog.baseUnit,
    unitsPerPack: catalog.unitsPerPack,
    conversionFactor: catalog.unitsPerPack,
    catalogPackaging: catalog,
  };
}
