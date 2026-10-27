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

### Dot matrix printing (local print bridge)

Normal and thermal invoices print from a PDF the server renders. Dot matrix is the exception:
the printer needs raw ESC/P bytes, which a browser cannot send, so it goes through the
**print bridge**, a small app on the shop PC listening on loopback (`http://127.0.0.1:9110` by
default). The address and the timeouts come from the backend (`GET /print-bridge/connection`),
never from this package.

**The backend decides; this package carries.** Every print decision lives in `inventory-api`
(`GET /print-bridge/connection`, `POST /print-jobs`, `POST /print-jobs/outcome`,
`POST /print-bridge/status`): where the bridge listens and how long to wait on it, whether a
bridge counts as present, whether to print or download, invoice or estimate, copies, the
`.prn` filename, how long to watch the job and what a result means. Nothing here reads the
bridge payload or decides an outcome.

- `ui/useDotMatrixPrint.ts` is shared by `PrintInvoiceModal` (`SALE`) and
  `PrintCreditNoteModal` (`REFUND`, `VENDOR_RETURN`).
- `queries/hooks.ts` `usePrintBridgeStatusQuery` reads the connection, probes the bridge when
  the dot matrix option is chosen (the backend's health timeout, never retried) and asks the
  backend what it found:
  `NOT_DETECTED`, `OUTDATED` (still prints) or `CONNECTED`, with the download link.
  `ui/PrintBridgeNotice.tsx` shows Install, Update or Connected from that verdict.
- `usePrintDocumentMutation` runs the four steps: ask the backend for a plan, send its
  `bridgeRequest` to the bridge unchanged, poll the bridge's job history for as long as the
  plan says, and report what was seen. The backend's verdict comes back as a code;
  `lib/printMessages.ts` words it. A refusal that may already have printed offers no file,
  so one click cannot produce two physical invoices.
- `lib/printJobCache.ts` keeps the jobs this browser sent and has not seen finish, in
  `localStorage` per shop (`sk.printJobs.v1.<shopId>`), for the backend's `inFlightTtlMs`
  (2 minutes). The backend stores nothing. A second print of the same document sends the
  entry's age as `pendingAgeMs` and the backend answers `IN_PROGRESS`; a job still queued when
  its modal closed is checked again the next time a print modal probes the bridge
  (`useSettleCachedPrintJobsMutation`), reported, and shown as a toast such as
  "Invoice T001148 printed" (`describeLatePrint`). One past its time without a result is
  reported `EXPIRED` and shown as unconfirmed. Two tabs racing fall back to the bridge's own
  409; two PCs are not deduplicated.
- `lib/printBridge.ts` is the only raw `fetch` in this package, on purpose: the bridge is a
  loopback app, not the StockKart API, so `apiClient`'s base URL and auth headers would be wrong
  there. Everything that talks to the StockKart API goes through `api/print.api.ts`.
- `lib/printDocument.ts` saves the printer file and opens PDF previews for both modals.
- Open follow-up: the `.prn` fallback does not set the printer's pitch (the bridge adds that),
  so without a bridge the operator sets it on the printer.

### Advanced product search (`search/`, `ui/search/`)

Product Search and Scan & Sell call `POST /inventory/search` (`inventoryApi.searchAdvanced`, `useInventorySearchQuery`): text + filter groups + facet counts + sort + paging in one request. The filter panel is built from `GET /inventory/search/fields` (`useSearchFieldsQuery`), so a vertical field marked `searchable` in its schema appears with no frontend change.

- `search/searchState.ts` — the page state and pure helpers (`toggleValue`, `setRange`, `clearFilters`, …); a group never has zero values.
- `search/searchUrl.ts` — the only code that reads or writes the URL (`?q=&f=field:op:payload&sort=&page=&size=&dump=`); property-tested round trip.
- `search/useProductSearch.ts` — the page's state machine. An empty URL is the **default search** (everything in the shop, default sort, first page of 20), so the page opens on products rather than an empty form. Filter ticks apply after 250 ms, sort/page at once, text waits for Search; every change goes to the URL, which is the source of truth. Leaving the default search pushes a history entry (Back returns to it); refining replaces.
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

### Rate rules (`ui/rateRules/`, `queries/rateRules.queries.ts`)

- **Profile → Rate rules** (`RateRulesSection`, registered by `plugins/registry`) edits the shop's
  ordered rate rules: name, base, discount % and scheme (`SchemeInput`, shared with Scan & Sell).
  Rules keep the order they were added in; "Save rules" (the only save button) sends
  `PUT /shops/active-shop/rate-rules` and then refetches the rules and reloads this shop's
  capabilities (`features.rateRules`) in place, keeping the old value until the new one arrives
  (`fetchCapabilities({ force: true })`). A 403 reloads the rules, so the section turns
  read-only; a 409 (`RATE_RULES_CONFLICT`, someone else saved first) shows the server's message
  and loads the rules now saved. The draft helpers live in `lib/rateRulesDraft.ts`.
- **The backend decides; this package carries.** Base choices come only from the API's
  `baseOptions` (the picker is hidden when there is one), never from the shop type. Each rule's
  row shows its sample, matched by name from what `POST /rate-rules/preview` returns for the
  draft, price, GST label and `termsText` as sent; the screen does no rate, discount, scheme or
  tax arithmetic. A rule that cannot be generated shows "Not generated" with the server's reason
  in words (`skippedReasonText`).
- **Access.** When `enabled` is false (cafe) the registry hides the Profile tab
  (`useRateRulesAvailable`) and the section renders nothing; it is read-only (no inputs, no
  Save) when `canEdit` is false. The owner grants editing per person under Access Control
  ("Edit rate rules and rates", `rateRulesEdit`).

### Rate rules display (`ui/rateRules/`)

`GeneratedRatesList` shows rule-generated rates exactly as the API returns them: price, `termsText`, a GST label (`INCLUSIVE` "incl. GST", `EXCLUSIVE` "+ GST"), an "overridden" marker when `manual` is set, an "unsaved" marker on rates whose terms were edited and not saved (`pendingEdit`), and rules skipped or left below cost (`BELOW_COST` is worded "below cost"; a `REPLACED_BY_RULE` warning says the rule now sets a rate that was typed by hand). Input ids come from `useId`, never from rate names. Given `canEdit` (the `rateRulesEdit` grant) a rule rate offers its discount % and scheme (`SchemeInput`), never its price, plus "Reset to rule" on an overridden rate. Those sit on one row under the rate's name and terms (it wraps on a narrow screen, Reset at its end), with the "schemes can't be removed by override" note under the row. Nothing here works out a price.

- `EntryRatePreview` is the Product Entry block: it fetches the preview itself (debounced `useRateRulesPreviewQuery` on the typed PTR / MRP / selling price / cost / GST, plus `costPriceIncludesTax` from the bill's server-resolved tax treatment; `lib/ratePreviewRequest.ts` builds the request) and shows the result read-only. Overrides cannot clear a discount or scheme (the server treats blank as unchanged), so the editor restores the saved value and points to "Reset to rule". Term overrides exist only on a saved batch, so a new batch has no edit action (the backend ignores terms on create).
- On Product Entry the hand-typed "Rates (optional)" editor and "Default rate" select stay distributor-only. Any non-cafe shop whose backend flag `features.rateRules` is true (never by counting rules), retailers included, sees `EntryRatePreview` instead (`lib/entryRateFlags.ts`).
- `core/pricing` imports `GeneratedRatesList` from the barrel for the price edit page; the Profile → Rate rules sample rows use it read-only too.

### Barcode sticker printing (`lib/renderBarcodeLabelsHtml.ts`, `ui/labelLayout/`)

- **Layout comes from the server.** Profile → Barcode labels edits a draft; the field catalog
  (`GET /barcode-label-layout/field-catalog`) supplies sticker sizes (incl. `38x38`), sheet presets
  and `rollLimits`, and the live preview reads the draft's resolved layout from
  `POST /barcode-label-layout/preview` (`useLabelLayoutPreviewQuery`). The screen does not compute
  sticker, sheet or roll geometry, and does not range-check the roll fields; the server does and the
  preview shows its message.
- **Multi-across rolls.** For `ROLL`, "Labels across the roll" and "Gap between columns" are saved
  as `rollLabelsAcross` / `rollColumnGapMm`. The layout then carries `rollSpec` (page box for one
  roll row plus `pitchMm`, the column pitch snapped to 203 dpi dots by the server), and the
  renderer prints one roll row per page with `@page { size: <row>; margin: 0 }`. Without a
  `rollSpec` the old single-column roll output is unchanged. Needs inventory-api #239 deployed.
- **Compact template.** Prints values only (no "PRODUCT NAME:" prefix) unless a field's label is
  switched on; the server resolves this per field (`showLabel`). Left-column values wrap at word
  breaks to two lines, the header and the price stay on one line, and nothing grows past the
  sticker size (checked for 2-up 38x38). The right column is as wide as its longest value (up to
  60%), so "₹350.00" prints whole instead of "₹350…". The header line and the bars are centred
  across the sticker.
- **Lines per sticker.** The server's `maxLines` follows the sticker height: 4 on 25 mm
  (`38x25`, `50x25`), 6 on `38x38`, 8 on `100x50`. When the lines do not fit beside 38% bars,
  `fitStackedSticker` shortens the bars (down to 7 mm) and only then shrinks the text (down to
  6.5 pt). Layouts that already fit print exactly as before. Needs the matching inventory-api
  change deployed, or Save rejects more than the old limits.
- **Barcode position.** `TOP` (default) or `BOTTOM` applies to both templates. On Stacked, `BOTTOM`
  prints the field lines first, then the bars with the code under them.
- **Copies of each sticker.** The Print barcode stickers popup asks how many copies of each
  sticker to print (default 1); the renderer repeats each label in place (`RenderOptions.copies`),
  so one product printed 6 times on a 2-across roll fills 3 full rows. Use this instead of the
  printer dialog's Copies, which reprints a whole page and leaves the right column empty.
- **Bars a scanner can read.** Thermal printers print whole dots (0.125 mm at 203 dpi).
  `lib/barcodeDots.ts` sizes each printed Code128 module to a whole number of dots, measured
  against the sticker in the print window (≈24 mm wide for a 14-character code on 38 mm), with
  6 mm bars and crisp edges. A symbol stretched to the label prints cleanly but does not scan.
  This is print rendering against the laid-out DOM, so it stays in the frontend.
- **Printer driver (TSC TE244).** Stock = full roll row (e.g. 3.11 × 1.50 in for 2-up 38x38 with a
  3 mm gap), Graphics → Dithering **None**, Direct Thermal, Chrome print scale 100 %.

### Shop-shared grid columns (`ui/shopLayoutGrid/`, `lib/gridLayoutModel.ts`)

- **Layout comes from the server, per shop.** Column order, widths and hidden columns in the
  product entry **grid** view are one shared layout for the shop
  (`GET/PATCH/DELETE /shops/active-shop/grid-layouts/product-entry`, `useGridLayoutQuery`).
  Scroll position stays in the browser; columns keep their width on any screen and the grid
  scrolls sideways instead of squeezing them. List view follows the same **hidden** columns
  (optional fields disappear from each product's form) but has no widths or order of its own.
- **One column list.** `ProductEntryPage` builds `gridColumns` (key, header, fill-row control,
  row cell) once; `ShopLayoutGrid` draws the header, the "Fill all" row and every row from it,
  so order and widths always line up. Keys match the backend `GridColumnCatalog`
  (`field:<schemaKey>` for vertical schema fields), so a vertical's own fields need no grid code.
- **Rules from the server.** The catalog says which columns are `required` (to save), `hideable`,
  `reorderable` and pinned `FIRST`/`LAST` (`#`, Actions). Required fields (including Packaging,
  which both views now check on save) cannot be hidden. Only owners and admins (`canEdit`) see
  the resize handles, header dragging and the **Columns** drawer (`ShopLayoutColumnsBar`, in
  both views; list view's drawer shows/hides only); everyone else sees the shop's layout
  read-only.
- **Profile → Product entry columns** (`ShopLayoutColumnsSection` for `product-entry`, registered in
  `plugins/registry/src/profile-tabs.ts`) lists every catalog column with the server's `label`:
  show/hide, move up/down and width in px, plus Reset to defaults. Read-only for non-admins.
- **Another screen.** `ShopLayoutGrid`, `ShopLayoutColumnsBar`, `ShopLayoutColumnsSection` and the
  `gridLayout` queries all take a `gridId`. Add the id to `GRID_IDS` (and a `GridCatalog` on the
  backend), build that screen's column list, and render `<ShopLayoutGrid gridId=… />`.
- **One change per save.** A resize, move or show/hide is sent as one `PATCH` change; the cache
  updates first (`applyGridLayoutChange`) and the server's answer, which includes anything other
  members saved meanwhile, replaces it. Needs the matching inventory-api change deployed; until
  the layout loads the grid renders with content-sized columns as before.

## UI chrome

Prefer `productChrome` / `registrationChrome` from ui-kit for Scan Sell, carts, and registration grids.

## Related

- `@inventory-platform/schema` — vertical field inputs
- `@inventory-platform/plugin-cafe` — cafe sell surface overlay
- `@inventory-platform/pricing` — price edit
