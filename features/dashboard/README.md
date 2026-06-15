# @inventory-platform/dashboard

Dashboard feature library (product registration, scan-sell, product search, reminders, …).

## Vertical schema integration (Phases 2–4)

| Route | Status | Schema / API usage |
|-------|--------|-------------------|
| `dashboard.product-registration.tsx` | **Shipped** | Fully schema-driven vertical columns; `verticalFields` on submit only; expiry reminders from `verticalFields` |
| `dashboard.scan-sell.tsx` | **Shipped** | `cartBusinessType` from shop `verticalId`; search sorted by expiry soonest-first |
| `dashboard.product-search.tsx` | **Shipped** | Single `q` search (name, barcode, `batch …`); sorted by expiry; no expiry bucket cards |
| `dashboard.import.tsx` | **Shipped** | `batchNo` / `expiryDate` in `verticalFields` only |
| `dashboard.reminders.tsx` | **Shipped** | Expiry bucket cards via `remindersApi.getExpiryBuckets` (single parallel load with list) |
| Scan-sell detail modal | **Planned** | Columns from schema `showIn: scan-sell` |

Billing mode (`REGULAR` / `BASIC`) must match `GET /shops/me/schema?mode=` so field visibility stays aligned with the API.

### Remaining (this package)

- Scan-sell detail modal schema columns
- Import grid fully schema-driven (no hardcoded column keys)

## Running unit tests

Run `nx test @inventory-platform/dashboard` to execute the unit tests via [Jest](https://jestjs.io).
