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

- The tab strip follows `ScanSellQuotationStack` in `core/product` as its model — same
  chrome, same `+ New`, same confirm-before-close — so a cashier does not learn two tab
  idioms for one concept. It is a sibling, not a copy, and deliberately differs twice: it
  keeps a persistent "No tabs open" row where the original returns `null` (with no tabs and
  no row there is nowhere to press `+ New`), and its confirm is a ui-kit `ConfirmDialog`
  naming the token and the item count instead of a bare `window.confirm`. Keep the two in
  step on chrome and wording; do not propagate either of those two behaviours.
- **A flush whose response is lost resumes on the next mount.** The server claims and
  empties the tab before it creates any ticket, so a reload mid-flush would otherwise leave
  an empty tab, a disabled Print KOT, and tickets nothing on the screen can reach. The
  idempotency key is parked in `sessionStorage` **with the chosen bill** (`lib/punchKeyStore.ts`
  — the key alone cannot rebuild the request body once the cashier's choice is out of memory);
  on mount the page finds the parked round, replays it under the same key, prints what the
  server replays, and says so in a "Recovered an unfinished round on token N" notice. A resume
  that fails surfaces as a page-level alert, since there is no dialog open to carry it.
- **The nav entry is contributed by the backend `CafeUiContributor`, not by `nav.ts` here.** A
  nav item added in this layer does not reach the sidebar, and the screen stays unreachable.

### Known gap — a withdrawal is not told to the kitchen

Reducing or removing a menu line on the Sell screen that the kitchen already has creates a
CANCEL ticket server-side, correctly stamped and routed to the station. **Nothing prints it.**
The browser is the only printer in this system (`lib/printKot.ts` is the only transport; the Go
print bridge is deferred), and no code path fetches that ticket, because:

- `CartLineReductionPort.lineReduced` is `void` and `CheckoutResponse` carries no ticket ids,
  so the cancel `kotId` never reaches the client; and
- the transport lives here, in `plugins/cafe`, while the cart line that triggers the reduction
  lives in `core/product`, which may not import this package (`AGENTS.md` layer table).

So the cook keeps cooking. Until the reduction path returns the cancel ticket id — and a seam
exists for the Sell screen to reach a printer it is not allowed to import — the confirmation in
`core/product/src/ui/ScanSellMenuCartLine.tsx` tells the cashier plainly that the bill changed
and the station was **not** told, and to tell them. It used to say "that food will be thrown
away", which is worse than no confirmation: it converts uncertainty into false confidence.

Closing it needs, in order: the backend returning the cancel ticket id (see
`branch-review-fix-frontend.md` for the contract this frontend would code against), a registry
seam so `core/product` can hand a ticket id to the cafe plugin's print queue without importing
it, and then `printKot` on that id exactly as a flush does.

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
