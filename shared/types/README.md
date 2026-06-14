# @inventory-platform/types

Shared TypeScript types for API contracts and UI.

## Vertical schema (Phase 2+)

`src/lib/vertical-schema.ts` — `VerticalSchemaFieldDef`, `ShopSchemaResponse`, `searchable` / `indexed` / `storage` flags.

## Inventory & search (Phase 3–4)

`src/lib/api-types.ts` additions:

| Type | Purpose |
|------|---------|
| `InventoryExpiryBuckets` | Expiry bucket counts from `/inventory/expiry-buckets` or `/reminders/expiry-buckets` |
| `InventorySearchWithFiltersParams` | `searchWithFilters` request shape |
| `InventoryItem.verticalFields` | Extension field bag on read/write |

## Building

Run `nx build types` to build the library.
