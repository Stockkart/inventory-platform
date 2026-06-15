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
| `inventoryApi.search({ q, sort, limit, cursor? })` | `GET /api/v1/inventory/search` — `meta.nextCursor` for next page |
| `inventoryApi.getExpiryBuckets(expiringSoonDays?)` | `GET /api/v1/inventory/expiry-buckets` (Analytics surface) |

Unified `q` examples: `paracetamol`, `batch 1947304`, `dolo batch ABC12`.

## Reminders expiry buckets

Defined in `src/lib/reminders.ts`:

| Function | API |
|----------|-----|
| `remindersApi.getExpiryBuckets(expiringSoonDays?)` | `GET /api/v1/reminders/expiry-buckets` |

Concurrent identical GETs are deduped in-flight (e.g. React Strict Mode).

## Building

Run `nx build api` to build the library.
