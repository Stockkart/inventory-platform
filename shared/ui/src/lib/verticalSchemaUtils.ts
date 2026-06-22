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

export function fieldLabel(field: VerticalSchemaFieldDef): string {
  if (field.label?.trim()) {
    return field.label.trim();
  }
  return humanizeKey(field.key);
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

/** Vertical-owned inventory fields for dynamic UI (extension storage + companyName layout). */
function isDynamicInventoryField(field: VerticalSchemaFieldDef): boolean {
  if (field.key === 'companyName') {
    return true;
  }
  return field.storage === 'extension';
}

/** Schema-driven columns for a UI surface (excludes universal core fields rendered by platform layout). */
export function getDynamicInventoryFields(
  entities: Record<string, { fields?: VerticalSchemaFieldDef[] }> | undefined,
  surface: VerticalSchemaSurface
): VerticalSchemaFieldDef[] {
  return getEntityFields(entities, 'inventory').filter(
    (field) =>
      isVisibleOnSurface(field, surface) && isDynamicInventoryField(field)
  );
}

/** Extension fields dropped from cafe ingredient registration (cost lives on pricing). */
const SIMPLE_PRICING_REGISTRATION_EXCLUDED_KEYS = new Set([
  'lastPurchaseRate',
  'reorderLevel',
]);

export function registrationFieldsForBilling(
  shopSchema: { verticalId: string; mode: string; entities: Record<string, { fields?: VerticalSchemaFieldDef[] }> } | null,
  billingMode: 'REGULAR' | 'BASIC',
  shopId?: string | null
): VerticalSchemaFieldDef[] {
  if (!shopSchema || !isRegistrationSchemaReady(shopSchema, billingMode, { shopId })) {
    return [];
  }
  return getDynamicInventoryFields(shopSchema.entities, 'registration');
}

/** Hide legacy / medical-only schema columns when {@code simplePricing} is enabled (cafe). */
export function filterRegistrationFieldsForSimplePricing(
  fields: VerticalSchemaFieldDef[],
  simplePricing: boolean
): VerticalSchemaFieldDef[] {
  if (!simplePricing) {
    return fields;
  }
  return fields.filter(
    (field) => !SIMPLE_PRICING_REGISTRATION_EXCLUDED_KEYS.has(field.key)
  );
}

/** True when shop schema is loaded and matches the active billing mode. */
export function isRegistrationSchemaReady(
  shopSchema: { shopId?: string; verticalId?: string; mode?: string; entities?: Record<string, unknown> } | null,
  billingMode: 'REGULAR' | 'BASIC',
  options?: { shopId?: string | null }
): boolean {
  if (!shopSchema?.verticalId || !shopSchema.entities) {
    return false;
  }
  if (
    options &&
    (options.shopId === null || options.shopId === undefined)
  ) {
    return false;
  }
  if (
    shopSchema.shopId &&
    options?.shopId &&
    shopSchema.shopId !== options.shopId
  ) {
    return false;
  }
  const expectedMode = schemaModeForBilling(billingMode);
  if (shopSchema.mode !== expectedMode) {
    return false;
  }
  return getDynamicInventoryFields(
    shopSchema.entities as Record<string, { fields?: VerticalSchemaFieldDef[] }>,
    'registration'
  ).length > 0;
}

/** Split company name (after barcode) and sell-direct from other vertical registration columns. */
export function partitionRegistrationFields(
  fields: VerticalSchemaFieldDef[]
): {
  companyField: VerticalSchemaFieldDef | null;
  sellDirectField: VerticalSchemaFieldDef | null;
  otherFields: VerticalSchemaFieldDef[];
} {
  const companyField =
    fields.find((field) => field.key === 'companyName') ?? null;
  const sellDirectField =
    fields.find((field) => field.key === 'sellDirect') ?? null;
  const otherFields = fields.filter(
    (field) => field.key !== 'companyName' && field.key !== 'sellDirect'
  );
  return { companyField, sellDirectField, otherFields };
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
  const bag = product.verticalFields as Record<string, unknown> | undefined;

  if (field.storage === 'extension') {
    const fromBag = bag?.[field.key];
    if (fromBag != null && fromBag !== '') {
      return formatFieldValueForInput(field, fromBag);
    }
    const direct = record[prop];
    if (direct != null && direct !== '') {
      return formatFieldValueForInput(field, direct);
    }
    return '';
  }

  const direct = record[prop];
  if (direct != null && direct !== '') {
    return String(direct);
  }
  const fromBag = bag?.[field.key];
  if (fromBag != null && fromBag !== '') {
    return String(fromBag);
  }
  return '';
}

function formatFieldValueForInput(
  field: VerticalSchemaFieldDef,
  value: unknown
): string {
  if (field.key === 'sellDirect' || field.type === 'boolean') {
    if (value === true || value === 'true' || value === 'yes') return 'yes';
    if (value === false || value === 'false' || value === 'no') return 'no';
  }
  if (field.type === 'boolean') {
    return value === true || value === 'true' ? 'true' : 'false';
  }
  if (field.type === 'date' && value != null) {
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.includes('T') ? text : `${text.slice(0, 10)}T00:00:00Z`;
    }
  }
  return String(value);
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
      [prop]: '',
    };
  }
  return { [prop]: value };
}

function coerceFieldValue(
  field: VerticalSchemaFieldDef,
  value: string
): string | number | boolean | null {
  if (value === '') {
    return null;
  }
  if (field.key === 'sellDirect' || field.type === 'boolean') {
    if (value === 'yes' || value === 'true') return true;
    if (value === 'no' || value === 'false') return false;
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

/** Move legacy top-level extension values into {@code verticalFields} for form state. */
export function hydrateExtensionFieldsOnProduct<
  T extends VerticalFieldProduct & Record<string, unknown>,
>(product: T, fields: VerticalSchemaFieldDef[]): T {
  const extensionFields = fields.filter((f) => f.storage === 'extension');
  if (extensionFields.length === 0) {
    return product;
  }
  const bag: Record<string, unknown> = {
    ...((product.verticalFields as Record<string, unknown> | undefined) ?? {}),
  };
  const record = product as Record<string, unknown>;
  let changed = false;
  for (const field of extensionFields) {
    const prop = apiPropertyName(field);
    const direct = record[prop];
    if (direct != null && direct !== '') {
      if (bag[field.key] == null || bag[field.key] === '') {
        bag[field.key] = coerceFieldValue(field, String(direct));
        changed = true;
      }
      record[prop] = '';
      changed = true;
    }
  }
  if (changed) {
    product.verticalFields = bag;
  }
  return product;
}

/** True when API responses include an extension field bag (writes should use verticalFields only). */
export function itemUsesExtensionBag(item: {
  verticalFields?: Record<string, unknown> | null;
}): boolean {
  return (
    item.verticalFields != null && Object.keys(item.verticalFields).length > 0
  );
}

/** Read an extension field for display (verticalFields bag, then legacy top-level). */
export function getExtensionFieldString(
  item: VerticalFieldProduct,
  key: string
): string {
  const bag = item.verticalFields as Record<string, unknown> | undefined;
  const fromBag = bag?.[key];
  if (fromBag != null && fromBag !== '') {
    return String(fromBag);
  }
  const legacy = (item as Record<string, unknown>)[key];
  if (legacy != null && legacy !== '') {
    return String(legacy);
  }
  return '';
}

/** Cafe inventory flagged for direct sell on the cashier screen. */
export function isSellDirectInventory(item: VerticalFieldProduct): boolean {
  const raw = getExtensionFieldString(item, 'sellDirect').trim().toLowerCase();
  return raw === 'yes' || raw === 'true';
}

export function getInventoryBatchNo(item: VerticalFieldProduct): string {
  const value = getExtensionFieldString(item, 'batchNo');
  return value || '—';
}

export function formatInventoryExpiryDate(
  item: VerticalFieldProduct,
  locale = 'en-IN'
): string {
  const raw =
    getExtensionFieldString(item, 'expiryDate') ||
    String((item as { expiryDate?: string }).expiryDate ?? '');
  if (!raw.trim()) {
    return '—';
  }
  try {
    return new Date(raw).toLocaleDateString(locale);
  } catch {
    return raw.slice(0, 10);
  }
}

export function hasInventoryExpiryDate(item: VerticalFieldProduct): boolean {
  return getExtensionFieldString(item, 'expiryDate').trim().length > 0;
}

/** Epoch ms for sorting; null when no expiry on the item. */
export function getInventoryExpiryTimestamp(
  item: VerticalFieldProduct
): number | null {
  const raw =
    getExtensionFieldString(item, 'expiryDate') ||
    String((item as { expiryDate?: string }).expiryDate ?? '');
  if (!raw.trim()) {
    return null;
  }
  const ts = Date.parse(raw);
  return Number.isNaN(ts) ? null : ts;
}

/** Soonest expiry first; items without expiry sort last. */
export function sortInventoryByExpirySoonest<T extends VerticalFieldProduct>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const ta = getInventoryExpiryTimestamp(a);
    const tb = getInventoryExpiryTimestamp(b);
    if (ta == null && tb == null) {
      return 0;
    }
    if (ta == null) {
      return 1;
    }
    if (tb == null) {
      return -1;
    }
    return ta - tb;
  });
}

export function isExtensionSchemaField(
  fields: VerticalSchemaFieldDef[],
  key: string
): boolean {
  return fields.some((f) => f.key === key && f.storage === 'extension');
}

/**
 * Removes top-level keys that belong in {@code verticalFields} and attaches the extension bag.
 * Extension-schema fields must never be duplicated on the core bulk item DTO.
 */
export function attachVerticalFieldsToBulkItem<T extends Record<string, unknown>>(
  item: T,
  product: VerticalFieldProduct,
  registrationFields: VerticalSchemaFieldDef[]
): T & { verticalFields?: Record<string, unknown> } {
  const out: Record<string, unknown> = { ...item };
  for (const field of registrationFields) {
    if (field.storage === 'extension') {
      delete out[apiPropertyName(field)];
    }
  }
  const verticalPayload = buildVerticalFieldsPayload(product, registrationFields);
  if (verticalPayload) {
    out.verticalFields = verticalPayload;
  }
  return out as T & { verticalFields?: Record<string, unknown> };
}

/** Core-only expiry for bulk when schema stores expiry on core (non-extension verticals). */
export function formatCoreExpiryDateForApi(raw: string): string {
  if (!raw.trim()) {
    return '';
  }
  return raw.includes('T') && raw.includes('Z')
    ? raw
    : `${raw.trim().slice(0, 10)}T00:00:00Z`;
}
