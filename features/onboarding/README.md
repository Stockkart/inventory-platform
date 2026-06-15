# @inventory-platform/onboarding

Shop onboarding flow (new shop + add-shop).

## Vertical schema integration (Phase 2 — shipped)

- **Vertical step** — user selects from `GET /verticals`
- **Business details** — shop-only fields from `GET /verticals/{id}/schema` (`entities.shop`, e.g. medical `dlNo`, `fssai`)
- Platform tax fields (GSTIN, PAN, SGST, CGST) remain universal; vertical compliance fields are schema-driven only

Submit sends `verticalId` on `RegisterShopDto`.

See [Vertical Plugin Architecture v4.9](../../../inventory-api/docs/VERTICAL_PLUGIN_ARCHITECTURE.md) for full roadmap.

## Running unit tests

Run `nx test @inventory-platform/onboarding` to execute the unit tests via [Jest](https://jestjs.io).
