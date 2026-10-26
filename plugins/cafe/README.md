# @inventory-platform/plugin-cafe

**Status:** Active

Cafe vertical plugin: ingredient-oriented stock, menu admin, and sell (ScanSellPage
cafe layout with menu catalog + quotations) — loaded by `verticalId` via the plugin registry.

## Owns

- Routes: menu, menu-sell (→ ScanSellPage cafe layout), manual-stock (ingredient search)
- Nav contribution **Cafe** (ingredient registration/search labels, Menu, Sell)
- Cafe-specific page UI under `pages/` (MenuAdmin, ManualStock; Sell reuses core ScanSellPage)

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

## Does not own

- Core product registration implementation (`core/product` — cafe may deep-link / reuse paths)
- Plugin loader / nav merge (`plugin-registry`)

## Layout

`pages/` · `routes/` · `routes.ts` · `nav.ts` · `types/` · `index.ts`

## Notes

- Ensure the dashboard layout loads the vertical plugin so cafe nav icons/labels resolve.
- Prefer `productChrome` for stock/search cards consistent with medical Scan Sell.

## Related

- `@inventory-platform/plugin-registry`
- `@inventory-platform/routing` — `VerticalPlugin` type
- `@inventory-platform/contracts` — cafe menu types when shared
