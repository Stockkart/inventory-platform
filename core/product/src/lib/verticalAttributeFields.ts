import { getDynamicInventoryFields, getExtensionFieldString } from '@inventory-platform/schema';
import type { ShopSchemaResponse, VerticalSchemaFieldDef } from '@inventory-platform/schema/types';
import type { InventoryItem } from '../model/types';

/** Extension keys the product detail modal already renders in its own rows (Batch No, Expiry). */
const BUILT_IN_VERTICAL_KEYS = new Set(['batchNo', 'expiryDate']);

/**
 * The shop vertical's own inventory fields (e.g. sport, brand, model, size for a sports shop),
 * from the shop schema. They live in the vertical's extension collection and are shown and
 * edited in the detail modal's "Product attributes" section.
 */
export function verticalAttributeFieldsOf(
  schema: Pick<ShopSchemaResponse, 'entities'> | null | undefined,
): VerticalSchemaFieldDef[] {
  return getDynamicInventoryFields(schema?.entities, 'registration').filter(
    (field) => field.storage === 'extension' && !BUILT_IN_VERTICAL_KEYS.has(field.key),
  );
}

/** Read-only text for a vertical field: dates as a local date, everything else as stored. */
export function verticalFieldDisplay(
  item: Pick<InventoryItem, 'verticalFields'>,
  field: VerticalSchemaFieldDef,
): string {
  const raw = getExtensionFieldString(item, field.key);
  if (!raw) return '—';
  if (field.type === 'date' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return new Date(`${raw.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  return raw;
}
