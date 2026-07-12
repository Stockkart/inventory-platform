import type { ShopProductSearchAccess } from './shop-access';

/** Core product fields the owner can grant per member (matches backend CORE_PRODUCT_SEARCH_FIELDS). */
export const CORE_PRODUCT_SEARCH_FIELDS = [
  { key: 'name', label: 'Product name' },
  { key: 'description', label: 'Description' },
  { key: 'companyName', label: 'Company' },
  { key: 'location', label: 'Location' },
  { key: 'batchNo', label: 'Batch no.' },
  { key: 'expiryDate', label: 'Expiry date' },
  { key: 'costPrice', label: 'Cost price (PTS)' },
  { key: 'priceToRetail', label: 'Selling price (PTR)' },
  { key: 'maximumRetailPrice', label: 'MRP' },
  { key: 'sellingPrice', label: 'Selling price override' },
  { key: 'hsn', label: 'HSN' },
  { key: 'cgst', label: 'CGST' },
  { key: 'sgst', label: 'SGST' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'baseUnit', label: 'Base unit' },
  { key: 'unitsPerPack', label: 'Pack size' },
] as const;

export type CoreProductSearchFieldKey = (typeof CORE_PRODUCT_SEARCH_FIELDS)[number]['key'];

/** Whether the user may edit a product-search field in the UI. */
export function canEditProductSearchField(
  field: string,
  access: ShopProductSearchAccess | null | undefined,
): boolean {
  if (!access) {
    return true;
  }
  if (!access.canEdit) {
    return false;
  }
  if (access.editMode === 'FULL_EDIT' || access.canEditAll) {
    return true;
  }
  return access.editableFields.includes(field);
}

/** True when the user can open product-search edit mode at all. */
export function hasProductSearchEditAccess(
  access: ShopProductSearchAccess | null | undefined,
): boolean {
  if (!access) {
    return true;
  }
  return access.canEdit;
}

/** Maps UI edit-form keys to RBAC field keys. */
export function uiFieldToRbacKey(uiKey: string): string {
  if (uiKey === 'conversionFactor') {
    return 'unitsPerPack';
  }
  return uiKey;
}

export function canEditProductSearchUiField(
  uiKey: string,
  access: ShopProductSearchAccess | null | undefined,
): boolean {
  if (!access) {
    return true;
  }
  if (!access.canEdit) {
    return false;
  }
  if (access.editMode === 'FULL_EDIT' || access.canEditAll) {
    return true;
  }
  return access.editableFields.includes(uiFieldToRbacKey(uiKey));
}
