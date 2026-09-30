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

- The server renders the text (`GET /invoices/{id}/dot-matrix`); the browser only hands it on.
  No layout, totals or tax are worked out here.
- `ui/PrintInvoiceModal.tsx` probes the bridge each time it opens (`usePrintBridgeHealthQuery`,
  never retried, 1.2 s timeout). With a bridge it sends the job; without one the bill downloads
  as a `.prn` file, so billing is never blocked.
- Every job carries `docType`: `INVOICE` or `ESTIMATE`. The bridge picks the page length from it.
- After sending, the modal polls the bridge's job history for about 5 seconds and reports
  **printed**, **failed** (with the printer's own error) or **still queued**. A 409 duplicate is
  information, not a failure. It falls back to the download only when the bridge was never
  reached, so one click cannot produce two physical invoices.
- `lib/printBridge.ts` is the only raw `fetch` in this package, on purpose: the bridge is a
  loopback app, not the StockKart API, so `apiClient`'s base URL and auth headers would be wrong
  there. Everything that talks to the StockKart API still goes through `api/`.
- Open follow-ups: the `.prn` fallback does not set the printer's pitch (the operator must pick
  condensed 17 CPI for a tax invoice, 10 CPI for an estimate), and a timeout before response
  headers is treated as unreachable even though the bridge may have queued the job.

## UI chrome

Prefer `productChrome` / `registrationChrome` from ui-kit for Scan Sell, carts, and registration grids.

## Related

- `@inventory-platform/schema` — vertical field inputs
- `@inventory-platform/plugin-cafe` — cafe sell surface overlay
- `@inventory-platform/pricing` — price edit
