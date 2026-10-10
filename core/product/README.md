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
**print bridge**, a small app on the shop PC listening on `http://127.0.0.1:9110`.

**The backend decides; this package carries.** Every print decision lives in `inventory-api`
(`POST /print-jobs`, `POST /print-jobs/{id}/outcome`, `POST /print-bridge/status`): whether a
bridge counts as present, whether to print or download, invoice or estimate, copies, the
`.prn` filename, how long to watch the job and what a result means. Nothing here reads the
bridge payload or decides an outcome.

- `ui/useDotMatrixPrint.ts` is shared by `PrintInvoiceModal` (`SALE`) and
  `PrintCreditNoteModal` (`REFUND`, `VENDOR_RETURN`).
- `queries/hooks.ts` `usePrintBridgeStatusQuery` probes the bridge when the dot matrix option
  is chosen (1.2 s timeout, never retried) and asks the backend what it found:
  `NOT_DETECTED`, `OUTDATED` (still prints) or `CONNECTED`, with the download link.
  `ui/PrintBridgeNotice.tsx` shows Install, Update or Connected from that verdict.
- `usePrintDocumentMutation` runs the four steps: ask the backend for a plan, send its
  `bridgeRequest` to the bridge unchanged, poll the bridge's job history for as long as the
  plan says, and report what was seen. The backend's verdict comes back as a code;
  `lib/printMessages.ts` words it. A refusal that may already have printed offers no file,
  so one click cannot produce two physical invoices.
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
  sticker size (checked for 2-up 38x38).
- **Bars a scanner can read.** Thermal printers print whole dots (0.125 mm at 203 dpi).
  `lib/barcodeDots.ts` sizes each printed Code128 module to a whole number of dots, measured
  against the sticker in the print window (≈24 mm wide for a 14-character code on 38 mm), with
  6 mm bars and crisp edges. A symbol stretched to the label prints cleanly but does not scan.
  This is print rendering against the laid-out DOM, so it stays in the frontend.
- **Printer driver (TSC TE244).** Stock = full roll row (e.g. 3.11 × 1.50 in for 2-up 38x38 with a
  3 mm gap), Graphics → Dithering **None**, Direct Thermal, Chrome print scale 100 %.

## UI chrome

Prefer `productChrome` / `registrationChrome` from ui-kit for Scan Sell, carts, and registration grids.

## Related

- `@inventory-platform/schema` — vertical field inputs
- `@inventory-platform/plugin-cafe` — cafe sell surface overlay
- `@inventory-platform/pricing` — price edit
