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

## Building

Run `nx build api` to build the library.
