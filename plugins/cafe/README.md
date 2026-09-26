# @inventory-platform/plugin-cafe

**Status:** Active

Cafe vertical plugin: ingredient-oriented stock, menu admin, and sell (ScanSellPage
cafe layout with menu catalog + quotations) — loaded by `verticalId` via the plugin registry.

## Owns

- Routes: menu, menu-sell (→ ScanSellPage cafe layout), manual-stock (ingredient search)
- Nav contribution **Cafe** (ingredient registration/search labels, Menu, Sell)
- Cafe-specific page UI under `pages/` (MenuAdmin, ManualStock; Sell reuses core ScanSellPage)
- Kitchen tickets (KOT): punch API, print queue (with dedupe), the ticket strip
  (`ui/KotTicketStrip.tsx`), and the Print KOT action mounted on the Sell screen through
  `VerticalPlugin.sellActions` (`ui/CafeKotBar.tsx`)

### Print KOT on the Sell screen

There is one cafe order surface, and it is the Sell screen. `ui/CafeKotBar.tsx` sits with the
order it punches — below the Current order card, above the totals — and is mounted through
`VerticalPlugin.sellActions`, rendered by `VerticalSellActions` from
`@inventory-platform/routing`, because `core/product` is `type:core` and may not import this
package. Process Payment stays the final step and is untouched; estimates are not orders and
get no bar.

Pressing it punches the whole cart: `POST /cafe/purchases/{purchaseId}/kots` with no body and
a non-blank `Idempotency-Key`. **The server computes the delta** — everything on the order
that the kitchen has not already been sent — so a second press after two more items sends only
those two, and a press with nothing new creates nothing and says so plainly ("Nothing new to
send"). A no-op dressed as an error makes a cashier press again.

- **One press, one round.** `punch.isPending` disables the button only after React re-renders,
  so a synchronous in-flight ref guards the window a double click or an impatient second tap
  on a slow connection lands in.
- **A failed punch is stated, never swallowed** — it is an order the kitchen never sees.
- **A punch whose response is lost resumes on the next mount.** The idempotency key is parked
  in `sessionStorage` (`lib/punchKeyStore.ts`) before the request goes out; on mount the bar
  finds the parked round, replays it under the same key, prints what the server replays, and
  says so. The slot is keyed by `purchaseId`, so switching carts remounts the bar and that
  cart's stranded round is picked up in turn — no cart is skipped because another was
  stranded first.
- **A replayed ticket does not print twice.** One set of already-queued kotIds decides both
  the strip and the print queue: only `/reprint` stamps a slip REPRINT, so a second unstamped
  copy of the same KOT number is exactly what a cook reads as a second order.

### Menu portions

An item is priced **either** by one `sellingPrice` **or** by a list of portions (`rates`), never
both. `pages/MenuAdminPage.tsx` edits portions as rows of **name + price**, the same shape the
pricing screen uses for custom rates (`core/pricing/src/pages/PriceEditPage.tsx`): Add portion,
type a name and a price, × to remove. Once an item has a named portion the single price field
steps aside, and its "Add to Sell" button says _Pick portion on Sell_ — that button cannot ask
which portion, and the Sell screen's picker can.

- **The id is frozen, the name is not.** A portion's id is a slug of the name it was first given
  (`Half Cup` → `half-cup`, de-duplicated within the item) and is never regenerated. It is what
  rides in `menu:<itemId>@<rateId>`, so renaming `Half` to `Half plate` changes only what the
  shop reads; every cart line and kitchen ticket still points at the same portion.
- **The dirty check includes `rates`.** `normalizeSectionsForCompare` must compare the portions
  or Save stays grey over an edit the cashier can see on screen — exactly the bug that shipped
  when `department` was added. `pages/MenuAdminPage.spec.tsx` asserts it against the real
  button's real disabled state, and the assertion was confirmed to fail when `rates` is dropped
  from the comparison.

### Known gap — a withdrawal is not told to the kitchen

Reducing or removing a menu line on the Sell screen that the kitchen already has creates a
CANCEL ticket server-side, correctly stamped and routed to the station. **Nothing prints it.**
The browser is the only printer in this system (`lib/printKot.ts` is the only transport; the Go
print bridge is deferred), and no code path fetches that ticket, because
`CartLineReductionPort.lineReduced` is `void` and `CheckoutResponse` carries no ticket ids, so
the cancel `kotId` never reaches the client.

So the cook keeps cooking. Until the reduction path returns the cancel ticket id, the
confirmation in `core/product/src/ui/ScanSellMenuCartLine.tsx` tells the cashier plainly that
the bill changed and the station was **not** told, and to tell them. It used to say "that food
will be thrown away", which is worse than no confirmation: it converts uncertainty into false
confidence.

## Does not own

- Core product registration implementation (`core/product` — cafe may deep-link / reuse paths)
- Plugin loader / nav merge (`plugin-registry`)

## Layout

`api/` · `queries/` · `lib/` · `pages/` · `ui/` · `routes/` · `routes.ts` · `nav.ts` · `types/` · `index.ts`

## Notes

- Ensure the dashboard layout loads the vertical plugin so cafe nav icons/labels resolve.
- Prefer `productChrome` for stock/search cards consistent with medical Scan Sell.
- `core/product` is `type:core` and may not import this package. Sell-screen UI owned by
  cafe is contributed through `VerticalPlugin.sellActions` and rendered by
  `VerticalSellActions` from `@inventory-platform/routing`.

## Related

- `@inventory-platform/plugin-registry`
- `@inventory-platform/routing` — `VerticalPlugin` type
- `@inventory-platform/contracts` — cafe menu types when shared
