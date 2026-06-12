# @inventory-platform/onboarding

Shop onboarding flow (new shop + add-shop).

## Vertical schema integration (Phase 2)

- **Vertical step** — user selects from `GET /verticals`
- **Business details** — shop-only fields from `GET /verticals/{id}/schema` (`entities.shop`, e.g. medical `dlNo`, `fssai`)
- Platform tax fields (GSTIN, PAN, SGST, CGST) remain universal; vertical compliance fields are schema-driven only

Submit sends `verticalId` on `RegisterShopDto`.

## Running unit tests

Run `nx test @inventory-platform/onboarding` to execute the unit tests via [Jest](https://jestjs.io).
