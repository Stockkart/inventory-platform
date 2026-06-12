# @inventory-platform/dashboard

Dashboard feature library (product registration, scan-sell, profile, …).

## Vertical schema integration (Phase 2)

| Route | Schema usage |
|-------|----------------|
| `dashboard.product-registration.tsx` | `useVerticalSchemaStore` + `registrationFieldsForBilling`; grid columns via `VerticalRegistrationGridCells`; list accordion layout (Barcode → Company → Product → …) |
| `dashboard.scan-sell.tsx` | `cartBusinessType` from shop `verticalId` |

Billing mode (`REGULAR` / `BASIC`) must match `GET /shops/me/schema?mode=` so field visibility stays aligned with the API.

## Running unit tests

Run `nx test @inventory-platform/dashboard` to execute the unit tests via [Jest](https://jestjs.io).
