# @inventory-platform/pricing

**Status:** Migrated

Inventory pricing search and edit (PTR, MRP, PTS, GST, sale add. discount, rates, default rate).

### Edit price (`/dashboard/price-edit/:pricingId?lot=<inventoryId>`)

- **The only place a lot's prices are edited.** The product search Edit dialog shows prices
  read-only; its "Edit price" link (and the ones in Scan & Sell and Pricing) opens this page with
  the lot id in `?lot=`.
- **Saves in two parts, each only when it changed.**
  - The single prices (PTR, MRP, PTS, GST, sale add. discount) go through `PUT /inventory/{id}`
    (`useUpdateInventoryLotMutation` from `@inventory-platform/product`). That endpoint applies
    the product-search grants and the lot's GST rules, and the mutation marks every product read
    stale, so product search and Scan & Sell show the new prices. `PATCH /pricing/{id}` ignores
    PTR and MRP, so they never go there.
  - The rates, the default rate and rule-rate resets go through `PATCH /pricing/{id}`
    (`useUpdatePricingMutation`), the one endpoint that takes `resetRates` and answers with
    `warnings` and `defaultRateOptions`. The page loads them with `usePricingQuery`.
  - Prices are written first: a new PTR or MRP regenerates rule rates, so the rates write that
    follows answers with the final rates. When only prices changed, the page reloads the pricing.
- **Follows RBAC.** Each input is enabled only when the user may edit that field
  (`canEditPriceField`); the Edit price links show only when the user may edit at least one
  (`canEditAnyPriceField`). GST is hidden for BASIC lots. The payload and its checks are
  `buildPriceUpdate` (only changed fields; an emptied sale add. discount is sent as `clearFields`)
  and `buildRatesUpdate` (null when the rates part is unchanged, so a member granted only MRP never
  writes pricing), both in `@inventory-platform/product`. Rule-rate terms follow the
  `rateRulesEdit` grant, hand-typed rates the `rates` field grant.
- Opened without `?lot=` (an old link), the page explains where to open it from instead of saving.

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

Rates the shop's rules generated (`base` set) are shown with `GeneratedRatesList` from `@inventory-platform/product` (terms text, GST label, "overridden" marker); hand-typed rates keep their name and price inputs. With the `rateRulesEdit` grant a rule rate's discount % and scheme can be changed or reset to the rule. Nothing is saved until Save: an override goes in the PATCH `rates` with the rate's current `price` and the new `discountPercent` / `scheme`, a reset goes in `resetRates: [name]`, and the server reprices and flags `manual`. A rule rate whose terms were changed and not saved yet shows an "unsaved" marker (`sameRateTerms` from `@inventory-platform/product` compares discount % and each scheme field against the saved rate). The save response's `warnings` are shown under the list in words (`BELOW_COST`; `REPLACED_BY_RULE` when a rule took over a hand-typed rate). The "Default rate" choices are the pricing response's `defaultRateOptions`, the names the server allows (a rate built on the selling price, or one named like a built-in price, is left out); the page does not decide this itself, so a rate added on the page is offered once saved. The current default stays listed so it is not silently changed.

## Related

- `@inventory-platform/contracts` — pricing types
- `@inventory-platform/product` — inventory search entry points
