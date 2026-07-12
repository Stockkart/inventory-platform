# @inventory-platform/accounting

**Status:** Migrated

Double-entry accounting for a shop: chart of accounts, journal entries, ledgers, trial balance, and financial reports.

## Owns

- Routes under `/dashboard/accounting/*` (overview, journal, ledger, vendors/customers parties, trial balance, COA, opening balances, P&L, balance sheet)
- Nav group **Accounting**
- Accounting API + Query hooks
- Domain UI (party sidebars, journal lines, report tables)

## Does not own

- Generic customer/vendor CRM lists (`core/user`)
- Scan-sell / inventory stock (`core/product`)

## Layout

`api/` · `queries/` · `pages/` · `ui/` · `routes.ts` · `nav.ts`

## UI chrome

Prefer `accountingChrome` / helpers from `@inventory-platform/ui-kit` (ledger layout, journal grids, active account rows).

## Related

- `@inventory-platform/ui-kit` — presentation
- `@inventory-platform/api-client` — HTTP
- `@inventory-platform/query` — Query client

This package was the Phase 2a template for domain extraction.
