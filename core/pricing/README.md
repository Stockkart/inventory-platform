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

Rates the shop's rules generated (`base` set) are shown with `GeneratedRatesList` from `@inventory-platform/product` (terms text, GST label, "overridden" marker); hand-typed rates keep their name and price inputs. With the `rateRulesEdit` grant a rule rate's discount % and scheme can be changed or reset to the rule. Nothing is saved until Save: an override goes in the PATCH `rates` with the rate's current `price` and the new `discountPercent` / `scheme`, a reset goes in `resetRates: [name]`, and the server reprices and flags `manual`. A rule rate whose terms were changed and not saved yet shows an "unsaved" marker. The save response's `warnings` are shown under the list in words (`BELOW_COST`; `REPLACED_BY_RULE` when a rule took over a hand-typed rate). The "Default rate" choices are the pricing response's `defaultRateOptions`, the names the server allows (a rate built on the selling price, or one named like a built-in price, is left out); the page does not decide this itself, so a rate added on the page is offered once saved. The current default stays listed so it is not silently changed.

## Related

- `@inventory-platform/contracts` — pricing types
- `@inventory-platform/product` — inventory search entry points
