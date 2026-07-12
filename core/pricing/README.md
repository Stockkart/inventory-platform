# @inventory-platform/pricing

**Status:** Migrated

Inventory pricing search and edit (PTR, MRP, rates).

## Owns

- Routes `/dashboard/pricing`, `/dashboard/price-edit/:pricingId`
- Nav item **Pricing** (Products & Sales group)
- Pricing API + Query hooks

## Does not own

- Product registration / stock (`core/product`)
- Scan-sell cart pricing logic beyond consuming pricing APIs

## Layout

`api/` · `queries/` · `pages/` · `model/` · `routes.ts` · `nav.ts`

## Related

- `@inventory-platform/contracts` — pricing types
- `@inventory-platform/product` — inventory search entry points
