/** Business profile field definition (from GET /shops/business-profile). */
export interface BusinessProfileFieldDefinition {
  key: string;
  type?: string;
  required?: boolean;
  visible?: boolean;
  label?: string;
  storage?: string;
}

export interface BusinessProfileEntityDefinition {
  fields?: BusinessProfileFieldDefinition[];
}

export interface BusinessProfileResponse {
  id: string;
  code: string;
  name: string;
  version: number;
  modules?: Record<string, boolean>;
  entities?: Record<string, BusinessProfileEntityDefinition>;
  pricing?: Record<string, unknown>;
  strategies?: Record<string, string>;
  compliance?: Record<string, unknown>;
  ui?: Record<string, unknown>;
}

const PHARMACY_FALLBACK_REQUIRED = new Set([
  'name',
  'companyName',
  'location',
  'count',
  'batchNo',
  'expiryDate',
  'maximumRetailPrice',
  'priceToRetail',
  'costPrice',
]);

export function profileField(
  profile: BusinessProfileResponse | null | undefined,
  entityKey: string,
  fieldKey: string
): BusinessProfileFieldDefinition | undefined {
  return profile?.entities?.[entityKey]?.fields?.find((f) => f.key === fieldKey);
}

export function isProfileFieldVisible(
  profile: BusinessProfileResponse | null | undefined,
  entityKey: string,
  fieldKey: string
): boolean {
  const field = profileField(profile, entityKey, fieldKey);
  if (!field) {
    return true;
  }
  return field.visible !== false;
}

export function isProfileFieldRequired(
  profile: BusinessProfileResponse | null | undefined,
  entityKey: string,
  fieldKey: string
): boolean {
  const field = profileField(profile, entityKey, fieldKey);
  if (field) {
    return field.required === true;
  }
  return PHARMACY_FALLBACK_REQUIRED.has(fieldKey);
}

export function profileFieldLabel(
  profile: BusinessProfileResponse | null | undefined,
  entityKey: string,
  fieldKey: string,
  fallback: string
): string {
  return profileField(profile, entityKey, fieldKey)?.label ?? fallback;
}

export function isProfileModuleEnabled(
  profile: BusinessProfileResponse | null | undefined,
  moduleKey: string
): boolean {
  if (!profile?.modules) {
    return moduleKey === 'schemes' || moduleKey === 'batchTracking' || moduleKey === 'expiryReminders';
  }
  return profile.modules[moduleKey] === true;
}

export interface ProductRegistrationValidationInput {
  name: string;
  companyName: string;
  location: string;
  count: number;
  expiryDate?: string;
  batchNo?: string;
  maximumRetailPrice: number;
  costPrice: number;
  priceToRetail: number;
  itemType?: string;
  itemTypeDegree?: number | null;
  sgst?: string;
  cgst?: string;
  purchaseDate?: string;
  conversionFactor?: number;
}

/** Returns an error message or null if valid. */
export function validateProductRegistrationFields(
  product: ProductRegistrationValidationInput,
  profile: BusinessProfileResponse | null | undefined,
  billingMode: 'REGULAR' | 'BASIC'
): string | null {
  const entity = 'inventory';
  const title = product.name || 'Unnamed';

  if (!product.name?.trim()) {
    return `Product "${title}" is missing product name`;
  }
  if (isProfileFieldRequired(profile, entity, 'companyName') && !product.companyName?.trim()) {
    return `Product "${title}" is missing company name`;
  }
  if (isProfileFieldRequired(profile, entity, 'location') && !product.location?.trim()) {
    return `Product "${title}" is missing location`;
  }
  if (isProfileFieldRequired(profile, entity, 'expiryDate') && !product.expiryDate) {
    return `Product "${title}" is missing expiry date`;
  }
  if (isProfileFieldRequired(profile, entity, 'batchNo') && !product.batchNo?.trim()) {
    return `Product "${title}" is missing batch number`;
  }

  if (product.count <= 0) {
    return `Product "${title}" count must be greater than 0`;
  }

  const factor = Number(product.conversionFactor) || 0;
  if (!Number.isFinite(factor) || factor <= 0) {
    return `Product "${title}": packaging factor is required and must be greater than 0`;
  }

  const ptr = Number(product.priceToRetail);
  const cost = Number(product.costPrice);
  const mrp = Number(product.maximumRetailPrice);

  if (isProfileFieldRequired(profile, entity, 'priceToRetail') && (!Number.isFinite(ptr) || ptr <= 0)) {
    return `Product "${title}": PTR is required and must be greater than 0`;
  }
  if (isProfileFieldRequired(profile, entity, 'costPrice') && (!Number.isFinite(cost) || cost <= 0)) {
    return `Product "${title}": cost (PTS) is required and must be greater than 0`;
  }
  if (isProfileFieldRequired(profile, entity, 'maximumRetailPrice') && (!Number.isFinite(mrp) || mrp <= 0)) {
    return `Product "${title}": MRP is required and must be greater than 0`;
  }

  if (
    product.itemType === 'DEGREE' &&
    (product.itemTypeDegree == null ||
      product.itemTypeDegree <= 0 ||
      !Number.isInteger(product.itemTypeDegree))
  ) {
    return `Product "${title}": when itemType is DEGREE, itemTypeDegree must be present and greater than zero`;
  }

  if (
    billingMode === 'BASIC' &&
    ((product.sgst && product.sgst.trim()) || (product.cgst && product.cgst.trim()))
  ) {
    return `Product "${title}": SGST/CGST must not be provided when billingMode is BASIC`;
  }

  return null;
}
