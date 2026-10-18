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

## Rate rules on the price edit page

Rates the shop's rules generated (`base` set) are shown with `GeneratedRatesList` from `@inventory-platform/product` (terms text, GST label, "overridden" marker); hand-typed rates keep their name and price inputs. With the `rateRulesEdit` grant a rule rate's discount % and scheme can be changed or reset to the rule. Nothing is saved until Save: an override goes in the PATCH `rates` with the rate's current `price` and the new `discountPercent` / `scheme`, a reset goes in `resetRates: [name]`, and the server reprices and flags `manual`. The save response's `warnings` (`BELOW_COST`) are shown under the list. A rate based on selling price is not offered as the default rate (the server would reset it to PTR).

## Related

- `@inventory-platform/contracts` — pricing types
- `@inventory-platform/product` — inventory search entry points
