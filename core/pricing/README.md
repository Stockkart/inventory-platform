# @inventory-platform/pricing

**Status:** Migrated

Inventory pricing search and edit (PTR, MRP, PTS, GST, sale add. discount, rates, default rate).

### Edit price (`/dashboard/price-edit/:pricingId?lot=<inventoryId>`)

- **The only place a lot's prices are edited.** The product search Edit dialog shows prices
  read-only; its "Edit price" link (and the ones in Scan & Sell and Pricing) opens this page with
  the lot id in `?lot=`.
- **Saves through `PUT /inventory/{id}`** (`useUpdateInventoryLotMutation` from
  `@inventory-platform/product`), not `PATCH /pricing/{id}`. That endpoint applies the
  product-search grants and the lot's GST rules, returns the stored prices, and the mutation marks
  every product read stale, so product search and Scan & Sell show the new prices.
  `PATCH /pricing/{id}` only takes rates and the default rate and ignored PTR and MRP.
- **Follows RBAC.** Each input is enabled only when the user may edit that field
  (`canEditPriceField`); the Edit price links show only when the user may edit at least one
  (`canEditAnyPriceField`). GST is hidden for BASIC lots. The payload and its checks are
  `buildPriceUpdate` in `@inventory-platform/product` (only changed fields; an emptied sale add.
  discount is sent as `clearFields`).
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

## Related

- `@inventory-platform/contracts` — pricing types
- `@inventory-platform/product` — inventory search entry points
