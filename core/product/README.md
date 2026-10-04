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
