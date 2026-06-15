# @inventory-platform/api

HTTP client for the inventory backend.

## Vertical schema endpoints

Defined in `src/lib/verticals.ts`:

| Function | API |
|----------|-----|
| `verticalsApi.listActive()` | `GET /api/v1/verticals` |
| `verticalsApi.getSchema(verticalId, mode, version?)` | `GET /api/v1/verticals/{id}/schema` |
| `verticalsApi.getShopSchema(mode)` | `GET /api/v1/shops/me/schema` |

Types live in `@inventory-platform/types` (`vertical-schema.ts`).

## Inventory search & expiry (Phase 4)

Defined in `src/lib/inventory.ts`:

| Function | API |
|----------|-----|
| `inventoryApi.searchWithFilters({ q, filters, sort, limit })` | `GET /api/v1/inventory/search` |
| `inventoryApi.getExpiryBuckets(expiringSoonDays?)` | `GET /api/v1/inventory/expiry-buckets` |
| `inventoryApi.getNearExpiry(days?, limit?)` | `GET /api/v1/inventory/near-expiry` |
| `inventoryApi.getFefo(batchNo?, limit?)` | `GET /api/v1/inventory/fefo` |

Filter keys use `filters[key]=value` query params (e.g. `filters[batchNo]`, `filters[nearExpiryDays]`).

## Reminders expiry buckets

Defined in `src/lib/reminders.ts`:

| Function | API |
|----------|-----|
| `remindersApi.getExpiryBuckets(expiringSoonDays?)` | `GET /api/v1/reminders/expiry-buckets` |

## Building

Run `nx build api` to build the library.
