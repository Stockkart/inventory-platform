import type {
  SchemaDisplayMode,
  VerticalSchemaFieldDef,
  VerticalSchemaSurface,
} from '@inventory-platform/types';

/** Product or form row that may carry core props and/or a verticalFields bag. */
export type VerticalFieldProduct = {
  id?: string;
  verticalFields?: Record<string, unknown> | null;
};

/** Inventory fields always rendered by platform UI (pricing, packaging, schemes, …). */
export const PLATFORM_INVENTORY_FIELD_KEYS = new Set([
  'name',
  'barcode',
  'count',
  'location',
  'description',
  'maximumRetailPrice',
  'costPrice',
  'priceToRetail',
  'businessType',
  'scheme',
  'schemePayFor',
  'schemeFree',
  'schemeType',
  'schemePercentage',
  'purchaseSchemeType',
  'purchaseSchemePayFor',
  'purchaseSchemeFree',
  'purchaseSchemePercentage',
  'saleAdditionalDiscount',
  'purchaseAdditionalDiscount',
  'itemType',
  'itemTypeDegree',
  'discountApplicable',
  'purchaseDate',
  'sgst',
  'cgst',
  'hsn',
  'sac',
  'baseUnit',
  'unitsPerPack',
  'unitConversions',
  'thresholdCount',
  'reminderAt',
  'customReminders',
  'vendorId',
  'lotId',
  'billingMode',
  'rates',
  'defaultRate',
]);

const DEFAULT_LABELS: Record<string, string> = {
  companyName: 'Company',
  batchNo: 'Batch Number',
  expiryDate: 'Expiry Date',
  storageTemp: 'Storage temp',
  sport: 'Sport',
  brand: 'Brand',
  model: 'Model',
  warrantyMonths: 'Warranty (months)',
  dlNo: 'Drug license no.',
  fssai: 'FSSAI',
  hsn: 'HSN/SAC',
  baseUnit: 'Unit',
};

export function fieldLabel(field: VerticalSchemaFieldDef): string {
  if (field.label?.trim()) {
    return field.label.trim();
  }
  return DEFAULT_LABELS[field.key] ?? humanizeKey(field.key);
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function apiPropertyName(field: VerticalSchemaFieldDef): string {
  return field.apiKey?.trim() || field.key;
}

export function isVisibleOnSurface(
  field: VerticalSchemaFieldDef,
  surface: VerticalSchemaSurface
): boolean {
  if (field.required) {
    return true;
  }
  if (!field.showIn?.length) {
    return surface === 'registration';
  }
  return field.showIn.includes(surface);
}

export function getEntityFields(
  entities: Record<string, { fields?: VerticalSchemaFieldDef[] }> | undefined,
  entityName: string
): VerticalSchemaFieldDef[] {
  return entities?.[entityName]?.fields ?? [];
}

/** Vertical-specific inventory fields for a UI surface (excludes platform-managed keys). */
export function getDynamicInventoryFields(
  entities: Record<string, { fields?: VerticalSchemaFieldDef[] }> | undefined,
  surface: VerticalSchemaSurface
): VerticalSchemaFieldDef[] {
  return getEntityFields(entities, 'inventory').filter(
    (field) =>
      isVisibleOnSurface(field, surface) &&
      !PLATFORM_INVENTORY_FIELD_KEYS.has(field.key)
  );
}

/** Medical registration fields used until shop schema finishes loading. */
export const MEDICAL_FALLBACK_REGISTRATION_FIELDS: VerticalSchemaFieldDef[] = [
  {
    key: 'companyName',
    label: 'Company Name',
    type: 'string',
    required: true,
    storage: 'core',
  },
  {
    key: 'batchNo',
    label: 'Batch Number',
    type: 'string',
    required: true,
    storage: 'extension',
  },
  {
    key: 'expiryDate',
    label: 'Expiry Date',
    type: 'date',
    required: true,
    storage: 'extension',
  },
];

export function registrationFieldsForBilling(
  shopSchema: { verticalId: string; mode: string; entities: Record<string, { fields?: VerticalSchemaFieldDef[] }> } | null,
  billingMode: 'REGULAR' | 'BASIC'
): VerticalSchemaFieldDef[] {
  const expectedMode = billingMode === 'BASIC' ? 'basic' : 'regular';
  if (shopSchema?.mode === expectedMode) {
    return getDynamicInventoryFields(shopSchema.entities, 'registration');
  }
  const verticalId = shopSchema?.verticalId ?? 'medical';
  if (verticalId === 'medical') {
    return billingMode === 'BASIC'
      ? MEDICAL_FALLBACK_REGISTRATION_FIELDS.filter((f) => f.key !== 'batchNo')
      : MEDICAL_FALLBACK_REGISTRATION_FIELDS;
  }
  return [];
}

/** Split company name (after barcode) from other vertical registration columns. */
export function partitionRegistrationFields(
  fields: VerticalSchemaFieldDef[]
): {
  companyField: VerticalSchemaFieldDef | null;
  otherFields: VerticalSchemaFieldDef[];
} {
  const companyField =
    fields.find((field) => field.key === 'companyName') ?? null;
  const otherFields = fields.filter((field) => field.key !== 'companyName');
  return { companyField, otherFields };
}

export function pickRegistrationField(
  fields: VerticalSchemaFieldDef[],
  key: string
): VerticalSchemaFieldDef | null {
  return fields.find((field) => field.key === key) ?? null;
}

export function getShopOnboardingFields(
  entities: Record<string, { fields?: VerticalSchemaFieldDef[] }> | undefined
): VerticalSchemaFieldDef[] {
  return getEntityFields(entities, 'shop').filter((field) =>
    isVisibleOnSurface(field, 'onboarding')
  );
}

export function schemaModeForBilling(
  billingMode: 'REGULAR' | 'BASIC'
): SchemaDisplayMode {
  return billingMode === 'BASIC' ? 'basic' : 'regular';
}

export function getVerticalFieldValue(
  product: VerticalFieldProduct,
  field: VerticalSchemaFieldDef
): string {
  const record = product as Record<string, unknown>;
  const prop = apiPropertyName(field);
  const direct = record[prop];
  if (direct != null && direct !== '') {
    return String(direct);
  }
  const bag = product.verticalFields as Record<string, unknown> | undefined;
  const fromBag = bag?.[field.key];
  if (fromBag != null && fromBag !== '') {
    return String(fromBag);
  }
  return '';
}

export function setVerticalFieldPatch(
  field: VerticalSchemaFieldDef,
  value: string
): Record<string, unknown> {
  const prop = apiPropertyName(field);
  if (field.storage === 'extension') {
    return {
      verticalFields: {
        [field.key]: value === '' ? null : coerceFieldValue(field, value),
      },
    };
  }
  return { [prop]: value };
}

function coerceFieldValue(
  field: VerticalSchemaFieldDef,
  value: string
): string | number | null {
  if (value === '') {
    return null;
  }
  if (field.type === 'number') {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  if (field.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00Z`;
  }
  return value;
}

export function validateProductVerticalFields(
  product: VerticalFieldProduct,
  fields: VerticalSchemaFieldDef[],
  productLabel: string
): string | null {
  for (const field of fields) {
    if (!field.required) {
      continue;
    }
    const value = getVerticalFieldValue(product, field);
    if (!value.trim()) {
      return `${productLabel}: ${fieldLabel(field)} is required`;
    }
  }
  return null;
}

export function buildVerticalFieldsPayload(
  product: VerticalFieldProduct,
  fields: VerticalSchemaFieldDef[]
): Record<string, unknown> | undefined {
  const extensionFields = fields.filter((f) => f.storage === 'extension');
  if (extensionFields.length === 0) {
    return undefined;
  }
  const bag: Record<string, unknown> = {
    ...((product.verticalFields as Record<string, unknown> | undefined) ?? {}),
  };
  for (const field of extensionFields) {
    const value = getVerticalFieldValue(product, field);
    if (value !== '') {
      bag[field.key] = coerceFieldValue(field, value);
    }
  }
  return Object.keys(bag).length > 0 ? bag : undefined;
}
