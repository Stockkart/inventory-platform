# @inventory-platform/dashboard

Dashboard feature library (product registration, scan-sell, profile, …).

## Vertical schema integration (Phase 2–3)

| Route | Schema usage |
|-------|----------------|
| `dashboard.product-registration.tsx` | Fully schema-driven vertical columns; no hardcoded medical expiry/batch fallbacks; waits for `GET /shops/me/schema` |
| `dashboard.scan-sell.tsx` | `cartBusinessType` from shop `verticalId` |

Billing mode (`REGULAR` / `BASIC`) must match `GET /shops/me/schema?mode=` so field visibility stays aligned with the API.

## Running unit tests

Run `nx test @inventory-platform/dashboard` to execute the unit tests via [Jest](https://jestjs.io).
