# @inventory-platform/dashboard

Dashboard feature library (product registration, scan-sell, product search, reminders, …).

## Vertical schema integration (Phases 2–4)

| Route | Status | Schema / API usage |
|-------|--------|-------------------|
| `dashboard.product-registration.tsx` | **Shipped** | Fully schema-driven vertical columns; `verticalFields` on submit only; waits for `GET /shops/me/schema` |
| `dashboard.scan-sell.tsx` | **Shipped** | `cartBusinessType` from shop `verticalId` |
| `dashboard.product-search.tsx` | **Shipped** | Schema `searchable` fields → `batchNo` + `nearExpiryDays` filters via `inventoryApi.searchWithFilters` |
| `dashboard.import.tsx` | **Shipped** | `batchNo` / `expiryDate` in `verticalFields` only |
| `dashboard.reminders.tsx` | **Shipped** | Expiry bucket summary cards via `remindersApi.getExpiryBuckets` |
| Scan-sell detail modal | **Planned** | Columns from schema `showIn: scan-sell` |

Billing mode (`REGULAR` / `BASIC`) must match `GET /shops/me/schema?mode=` so field visibility stays aligned with the API.

## Running unit tests

Run `nx test @inventory-platform/dashboard` to execute the unit tests via [Jest](https://jestjs.io).
