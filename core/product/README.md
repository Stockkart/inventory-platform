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

`api/` · `queries/` · `pages/` · `ui/` · `vertical/` · `lib/` · `routes.ts` · `nav.ts`

### Public entry points

`@inventory-platform/product` (the barrel) · `/types` · `/api` · `/print`

`/print` is deliberately narrow. `lib/printDocument.ts` is how every printed document in this
app reaches a printer — the server renders a PDF, `openPdfPreview` opens it, and the operator
prints from the viewer, falling back to a download when a popup blocker refuses the tab.
Invoices, credit notes and cafe kitchen tickets all go through it, so they cannot drift apart.
It is its own subpath rather than part of the barrel because the barrel pulls in `api/` and so
`apiClient`, which reads `localStorage` at module load — importing it from a plugin (or a test)
that only wants to print would drag a session dependency along with it.

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

### Advanced product search (`search/`, `ui/search/`)

Product Search and Scan & Sell call `POST /inventory/search` (`inventoryApi.searchAdvanced`, `useInventorySearchQuery`): text + filter groups + facet counts + sort + paging in one request. The filter panel is built from `GET /inventory/search/fields` (`useSearchFieldsQuery`), so a vertical field marked `searchable` in its schema appears with no frontend change.

- `search/searchState.ts` — the page state and pure helpers (`toggleValue`, `setRange`, `clearFilters`, …); a group never has zero values.
- `search/searchUrl.ts` — the only code that reads or writes the URL (`?q=&f=field:op:payload&sort=&page=&size=&dump=`); property-tested round trip.
- `search/useProductSearch.ts` — the page's state machine. Empty URL = **setting up** (filters accumulate, nothing requested until Search); a URL with a search = **refining** (filter ticks apply after 250 ms, sort/page at once, text waits for Search). The URL is the source of truth once searching.
- `ui/search/` — `SearchFilterStrip` (one dropdown per filter under the search bar, sort at the right end), `ActiveFilterChips` (plain-English wording in `search/filterChips.ts`), `SortSelect`, `CompanyChips` (Scan & Sell; Alt+1…5 picks a chip).

### Supplier bills: tax treatment, preview and corrections

- **Tax treatment.** Stock-in asks whether the bill's line amounts already include GST
  (`EXCLUSIVE` / `INCLUSIVE`). Left blank, the server reads it from the rows (cost at MRP: inclusive; below MRP: exclusive), else the vendor's `defaultTaxTreatment`, and the page shows which under the dropdown (`taxTreatmentSource`). A choice (or vendor default) the rows contradict shows the server's `taxTreatmentConflict` as a warning with a confirm checkbox; stock-in sends `confirmTaxTreatment` only when it is ticked and refuses otherwise. The type is
  owned by `@inventory-platform/user` (vendors) and re-exported from `/types`.
- **Bill preview.** The header subtotal, tax, invoice total and the summary bar come from
  `POST /vendor-purchase-invoices/preview-totals` (`usePurchaseTaxPreviewQuery`, debounced). The
  page sends the same rows as stock-in (`buildBulkItems`) and shows what comes back; it does not
  compute GST, schemes, discounts or totals itself. Line subtotal, tax total and invoice total are
  read-only, filled from the preview, and sent on stock-in so the bill stores them; the server
  works out any that are missing. Needs
  inventory-api #190 deployed first.
- **GST rate from the HSN.** Once a row's HSN is typed, `HsnGstRateSelect` (`ui/`) offers the
  rates the CBIC notifications allow for it, from `GET /taxation/hsn-gst-rates`
  (`useHsnGstRatesQuery`). Picking one fills CGST and SGST with the halves the server sends;
  both stay editable, and a rate typed by hand shows as "Custom". Used in the stock-in grid and
  the product detail form.
- **Correcting a header.** `VendorInvoicesPage` → `AmendInvoiceHeaderForm` sends
  `PATCH /vendor-purchase-invoices/{id}` through `useAmendVendorPurchaseInvoiceMutation`. Header
  only (bill discount, round off, tax treatment), with a required reason. While the form is open
  it shows the saved figures beside the corrected ones from `POST .../{id}/amend-preview`
  (`useInvoiceAmendmentPreviewQuery`), marks the ones that change and says the journal will be
  reposted; Save is off when nothing would change. After saving, the toast and the "Last
  corrected" line give the invoice total and tax before and after.

## UI chrome

Prefer `productChrome` / `registrationChrome` from ui-kit for Scan Sell, carts, and registration grids.

## Related

- `@inventory-platform/schema` — vertical field inputs
- `@inventory-platform/plugin-cafe` — cafe sell surface overlay
- `@inventory-platform/pricing` — price edit
