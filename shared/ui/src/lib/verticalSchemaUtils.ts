import type {
  CustomReminderInput,
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
  const bag: Record<string, unknown> = {};
  for (const field of extensionFields) {
    const value = getVerticalFieldValue(product, field);
    if (value !== '') {
      bag[field.key] = coerceFieldValue(field, value);
    }
  }
  return Object.keys(bag).length > 0 ? bag : undefined;
}

/** Extension field keys allowed for the active vertical schema. */
export function extensionFieldKeys(
  fields: VerticalSchemaFieldDef[]
): Set<string> {
  return new Set(
    fields.filter((f) => f.storage === 'extension').map((f) => f.key)
  );
}

/**
 * Drops vertical/extension values that do not belong to the active schema
 * (e.g. medical batch/expiry on a sports shop).
 */
export function sanitizeProductForVerticalSchema<T extends VerticalFieldProduct>(
  product: T,
  fields: VerticalSchemaFieldDef[]
): T {
  const allowedExtension = extensionFieldKeys(fields);
  const record = product as Record<string, unknown>;
  const rawBag =
    (product.verticalFields as Record<string, unknown> | undefined) ?? {};
  const bag: Record<string, unknown> = {};
  let bagChanged = false;

  for (const [key, value] of Object.entries(rawBag)) {
    if (allowedExtension.has(key)) {
      bag[key] = value;
    } else {
      bagChanged = true;
    }
  }

  let topLevelChanged = false;
  for (const field of fields) {
    if (field.storage !== 'extension') {
      continue;
    }
    const prop = apiPropertyName(field);
    if (prop !== field.key && record[prop]) {
      topLevelChanged = true;
    }
  }

  const legacyExtensionKeys = [
    'batchNo',
    'expiryDate',
    'sport',
    'brand',
    'model',
    'warrantyMonths',
    'companyName',
  ];
  for (const key of legacyExtensionKeys) {
    if (!allowedExtension.has(key) && record[key]) {
      topLevelChanged = true;
    }
  }

  if (!bagChanged && !topLevelChanged) {
    return product;
  }

  const nextRecord = topLevelChanged ? { ...record } : record;
  if (topLevelChanged) {
    for (const field of fields) {
      if (field.storage !== 'extension') {
        continue;
      }
      const prop = apiPropertyName(field);
      if (prop !== field.key && prop in nextRecord) {
        nextRecord[prop] = '';
      }
    }
    for (const key of legacyExtensionKeys) {
      if (!allowedExtension.has(key) && key in nextRecord) {
        nextRecord[key] = '';
      }
    }
  }

  return {
    ...(nextRecord as T),
    verticalFields: Object.keys(bag).length > 0 ? bag : {},
  };
}

/** Move legacy top-level extension values into {@code verticalFields} for form state. */
export function hydrateExtensionFieldsOnProduct<T extends VerticalFieldProduct>(
  product: T,
  fields: VerticalSchemaFieldDef[]
): T {
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

/** True when the active shop schema defines an inventory field (any vertical). */
export function shopSchemaHasInventoryField(
  schema:
    | { entities?: Record<string, { fields?: VerticalSchemaFieldDef[] }> }
    | null
    | undefined,
  fieldKey: string
): boolean {
  return getEntityFields(schema?.entities, 'inventory').some(
    (field) => field.key === fieldKey
  );
}

/**
 * Extension fields for product detail / scan-sell surfaces.
 * Uses shop schema when available; otherwise infers keys from {@code verticalFields} on the item.
 */
export function detailExtensionFieldsForItem(
  schema:
    | { entities?: Record<string, { fields?: VerticalSchemaFieldDef[] }> }
    | null
    | undefined,
  item: VerticalFieldProduct | null | undefined,
  surface: VerticalSchemaSurface = 'scan-sell'
): VerticalSchemaFieldDef[] {
  const fromSchema = getDynamicInventoryFields(schema?.entities, surface).filter(
    (field) => field.key !== 'companyName'
  );
  if (fromSchema.length > 0) {
    return fromSchema;
  }
  const bag = item?.verticalFields as Record<string, unknown> | undefined;
  if (!bag) {
    return [];
  }
  return Object.keys(bag)
    .filter((key) => bag[key] != null && bag[key] !== '')
    .map((key) => inferVerticalFieldDefFromBag(key, bag[key]));
}

function inferVerticalFieldDefFromBag(
  key: string,
  value: unknown
): VerticalSchemaFieldDef {
  let type: VerticalSchemaFieldDef['type'] = 'string';
  const lower = key.toLowerCase();
  if (lower.includes('date') || key === 'expiryDate') {
    type = 'date';
  } else if (typeof value === 'number') {
    type = 'number';
  }
  return {
    key,
    type,
    storage: 'extension',
  };
}

export function formatVerticalFieldDisplay(
  field: VerticalSchemaFieldDef,
  value: string
): string {
  if (!value.trim()) {
    return '—';
  }
  if (field.type === 'date') {
    try {
      return new Date(value).toLocaleDateString('en-IN');
    } catch {
      return value.slice(0, 10);
    }
  }
  return value;
}

/** Keeps end date on or after the reminder date. */
export function normalizeCustomReminderRow(
  reminder: CustomReminderInput
): CustomReminderInput {
  const reminderAt = reminder.reminderAt?.trim() ?? '';
  let endDate = reminder.endDate?.trim() ?? '';
  if (!reminderAt || !endDate) {
    return reminder;
  }
  const atMs = Date.parse(reminderAt);
  const endMs = Date.parse(endDate);
  if (!Number.isNaN(atMs) && !Number.isNaN(endMs) && endMs < atMs) {
    endDate = reminderAt;
  }
  return { ...reminder, reminderAt, endDate };
}

export function validateCustomReminders(
  reminders: CustomReminderInput[] | undefined | null,
  productLabel: string
): string | null {
  if (!reminders?.length) {
    return null;
  }
  for (let i = 0; i < reminders.length; i++) {
    const reminder = reminders[i];
    const hasContent =
      reminder.reminderAt?.trim() ||
      reminder.endDate?.trim() ||
      reminder.notes?.trim();
    if (!hasContent) {
      continue;
    }
    if (!reminder.reminderAt?.trim()) {
      return `${productLabel}: custom reminder ${i + 1} — reminder date is required`;
    }
    if (!reminder.endDate?.trim()) {
      return `${productLabel}: custom reminder ${i + 1} — end date is required`;
    }
    const atMs = Date.parse(reminder.reminderAt);
    const endMs = Date.parse(reminder.endDate);
    if (Number.isNaN(atMs) || Number.isNaN(endMs)) {
      return `${productLabel}: custom reminder ${i + 1} — invalid date`;
    }
    if (endMs < atMs) {
      return `${productLabel}: custom reminder ${i + 1} — end date cannot be before reminder date`;
    }
  }
  return null;
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
