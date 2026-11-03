import type { VerticalSchemaFieldDef } from '@inventory-platform/schema/types';
import {
  apiPropertyName,
  getVerticalFieldValue,
  setVerticalFieldPatch,
  type VerticalFieldProduct,
} from '@inventory-platform/schema';

/**
 * Core product properties the details modal renders in its own sections (they exist on every
 * product regardless of vertical). Every other field a vertical declares — batch, expiry, sport,
 * brand, ingredient type, ... — is rendered generically from the schema in "Additional fields",
 * so a new field in a vertical's seed shows up in view-and-edit with no frontend change.
 */
export const HAND_RENDERED_VERTICAL_KEYS: ReadonlySet<string> = new Set([
  'name',
  'companyName',
  'itemType',
  'itemTypeDegree',
  'hsn',
  'baseUnit',
]);

/** The schema fields that need a generic row because nothing else on the modal shows them. */
export function schemaOnlyFields(
  fields: readonly VerticalSchemaFieldDef[],
  handRendered: ReadonlySet<string> = HAND_RENDERED_VERTICAL_KEYS,
): VerticalSchemaFieldDef[] {
  return fields.filter((field) => !handRendered.has(field.key));
}

/** Field key → the text in its input while editing. */
export type VerticalDraft = Record<string, string>;

export function initVerticalDraft(
  item: VerticalFieldProduct,
  fields: readonly VerticalSchemaFieldDef[],
): VerticalDraft {
  const draft: VerticalDraft = {};
  for (const field of fields) {
    draft[field.key] = comparable(field, getVerticalFieldValue(item, field));
  }
  return draft;
}

export interface VerticalFieldsUpdate {
  /** Core-storage fields, keyed by their API property; go straight on the update payload. */
  core: Record<string, unknown>;
  /** Extension-storage fields, keyed by schema key; go in the payload's `verticalFields` bag. */
  extension: Record<string, unknown>;
  /** Schema keys whose value differs from the item, in schema order. */
  changedKeys: string[];
}

/**
 * Only what the user changed. The server merges the extension bag with what it already holds, so
 * sending just the changed keys is enough — and keeps per-field edit permissions meaningful.
 */
export function buildVerticalFieldsUpdate(
  item: VerticalFieldProduct,
  fields: readonly VerticalSchemaFieldDef[],
  draft: VerticalDraft,
): VerticalFieldsUpdate {
  const out: VerticalFieldsUpdate = { core: {}, extension: {}, changedKeys: [] };
  for (const field of fields) {
    const next = draft[field.key];
    if (next === undefined) continue;
    const before = comparable(field, getVerticalFieldValue(item, field));
    if (comparable(field, next) === before) continue;
    const text = next.trim();
    out.changedKeys.push(field.key);
    if (text === '') {
      // Cleared: say so explicitly rather than sending the form's empty string.
      if (field.storage === 'extension') out.extension[field.key] = null;
      else out.core[apiPropertyName(field)] = null;
      continue;
    }
    const patch = setVerticalFieldPatch(field, text);
    if (field.storage === 'extension') {
      const bag = patch.verticalFields as Record<string, unknown>;
      out.extension[field.key] = bag[field.key] ?? null;
    } else {
      out.core[apiPropertyName(field)] = patch[apiPropertyName(field)] ?? null;
    }
  }
  return out;
}

/** What to print for a field in view mode. */
export function formatVerticalFieldDisplay(
  field: VerticalSchemaFieldDef,
  value: string,
  locale = 'en-IN',
): string {
  const text = value.trim();
  if (!text) return '—';
  if (field.type === 'date') {
    const ts = Date.parse(text);
    return Number.isNaN(ts) ? text.slice(0, 10) : new Date(ts).toLocaleDateString(locale);
  }
  if (field.key === 'sellDirect') {
    return text === 'yes' || text === 'true' ? 'Yes' : 'No';
  }
  return text;
}

/** Vertical id as a heading, e.g. `cafe` → "Cafe". */
export function verticalDisplayName(verticalId: string | null | undefined): string {
  const id = (verticalId ?? '').trim();
  if (!id) return 'Vertical';
  return id
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Dates compare on the calendar day; everything else on trimmed text. */
function comparable(field: VerticalSchemaFieldDef, value: string): string {
  const text = (value ?? '').trim();
  if (field.type === 'date') return text.slice(0, 10);
  return text;
}
