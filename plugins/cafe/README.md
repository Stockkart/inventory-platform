# @inventory-platform/plugin-cafe

**Status:** Active

Cafe vertical plugin: ingredient-oriented stock, menu admin, and sell (ScanSellPage
cafe layout with menu catalog + quotations) — loaded by `verticalId` via the plugin registry.

## Owns

- Routes: menu, menu-sell (→ ScanSellPage cafe layout), manual-stock (ingredient search)
- Nav contribution **Cafe** (ingredient registration/search labels, Menu, Sell)
- Cafe-specific page UI under `pages/` (MenuAdmin, ManualStock; Sell reuses core ScanSellPage)
- Kitchen tickets (KOT): punch API, print queue (with dedupe), and the ticket strip UI
  (`ui/KotTicketStrip.tsx`) — the Sell screen no longer issues to the kitchen; that will
  move to its own tabbed screen

## Does not own

- Core product registration implementation (`core/product` — cafe may deep-link / reuse paths)
- Plugin loader / nav merge (`plugin-registry`)

## Layout

`api/` · `queries/` · `lib/` · `pages/` · `ui/` · `routes/` · `routes.ts` · `nav.ts` · `types/` · `index.ts`

## Notes

- Ensure the dashboard layout loads the vertical plugin so cafe nav icons/labels resolve.
- Prefer `productChrome` for stock/search cards consistent with medical Scan Sell.
- `core/product` is `type:core` and may not import this package.

## Related

- `@inventory-platform/plugin-registry`
- `@inventory-platform/routing` — `VerticalPlugin` type
- `@inventory-platform/contracts` — cafe menu types when shared
