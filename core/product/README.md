# @inventory-platform/product

**Status:** Migrated

Inventory and sell flows: product registration, search, stock corrections, scan-sell / checkout, returns, and purchase history.

## Owns

- Routes: `product-registration`, `import`, `product-search`, `stock-corrections`, `vendor-invoices`, `scan-sell`, `estimates`, `checkout`, `history`, `refund`, `vendor-return`, `m/upload`
- Nav groups **Products & Sales** (including History), **Returns**
- Product/inventory APIs + Query hooks
- Scan Sell UI and related widgets (`ui/`, `vertical/`)

## Does not own

- Cafe menu / ingredient manual stock (`plugins/cafe`)
- Pricing edit screens (`core/pricing`) — product may link into them
- Checkout domain package (`core/checkout` is still a scaffold; checkout route lives here today)

## Layout

`api/` · `queries/` · `pages/` · `ui/` · `vertical/` · `routes.ts` · `nav.ts`

### Menu portions on the Sell screen

A menu item may be sold in named portions — Qtr / Half / Full, each with its own name and price,
set in cafe Menu admin. `ui/CafeSellCatalogPanel.tsx` is the only place they are chosen.

- A portioned tile shows a **price range** (`₹180.00 – ₹320.00`) and how many portions there are,
  never one price that is only true of one portion.
- Tapping it opens a small `Modal` listing every portion as its **own name beside its own price**
  (`Half  ₹180.00`). A bare name next to a range would make the cashier infer the price, and an
  inference at the counter becomes a wrong bill. Dismissed by Escape, the backdrop, the header ×
  or Cancel; dismissing adds nothing.
- Choosing a portion calls `onAddMenuItem(item, rate)`. `ScanSellPage`'s `handleAddMenuItem`
  refuses a portioned item that arrives with no portion, so the picker really is the only way in.
- The portion rides **inside the sellable ref**: `menu:<itemId>@<rateId>` (`menuSellableRef`).
  Only the frozen rate id travels — never the display name (a rename must orphan nothing) and
  never the price (resolved server-side from the menu). Because the cart keys lines by ref, Half
  and Full of one dish are two separate lines with no further arrangement.
- An unportioned item is unchanged: one price on the tile, one tap, no modal.

## UI chrome

Prefer `productChrome` / `registrationChrome` from ui-kit for Scan Sell, carts, and registration grids.

## Related

- `@inventory-platform/schema` — vertical field inputs
- `@inventory-platform/plugin-cafe` — cafe sell surface overlay
- `@inventory-platform/pricing` — price edit
