# @inventory-platform/plugin-cafe

**Status:** Active

Cafe vertical plugin: ingredient-oriented stock, menu admin, and sell (ScanSellPage
cafe layout with menu catalog + quotations) — loaded by `verticalId` via the plugin registry.

## Owns

- Routes: menu, menu-sell (→ ScanSellPage cafe layout), manual-stock (ingredient search),
  cafe-kot (the kitchen-order screen)
- Nav contribution **Cafe** (ingredient registration/search labels, Menu, Sell)
- Cafe-specific page UI under `pages/` (MenuAdmin, ManualStock, CafeKot; Sell reuses core
  ScanSellPage)
- Kitchen tickets (KOT): the tab API and hooks, the print queue (with dedupe), the ticket
  strip (`ui/KotTicketStrip.tsx`) and the KOT screen — the Sell screen no longer issues to
  the kitchen

### The KOT screen (`/dashboard/cafe-kot`)

`pages/CafeKotPage.tsx` with `ui/CafeTabStrip.tsx`, `ui/CafeTabComposer.tsx` and
`ui/FlushTargetDialog.tsx`. One tab per party, each with an auto token, each holding **only
what has not yet been sent**. Print KOT asks which bill the round belongs to, sends one ticket
per station, appends the lines to that bill, and empties the tab — which keeps its token.

- The tab strip is deliberately the same control as `ScanSellQuotationStack` in `core/product`
  (same chrome, same `+ New`, same confirm-before-close). Change one, change the other.
- **The nav entry is contributed by the backend `CafeUiContributor`, not by `nav.ts` here.** A
  nav item added in this layer does not reach the sidebar, and the screen stays unreachable.
- `queries/screenData.ts` holds the hooks that import `@inventory-platform/product/api`; that
  import constructs the shared `apiClient` at module load (it reads `localStorage`), so it is
  kept out of `queries/hooks.ts`, which must stay importable from a plain-node test.

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
