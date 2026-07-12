# @inventory-platform/credit

**Status:** Migrated

Shop credit accounts: balances, manual charges, settlements, and entry timelines.

## Owns

- Route `/dashboard/credit`
- Nav group **Credit**
- Credit API + Query hooks / mutations
- Domain UI (party sidebar, account list, timeline, charge form)

## Does not own

- Accounting journal / ledger (`core/accounting`)
- Customer master data (`core/user`)

## Layout

`api/` · `queries/` · `pages/` · `ui/` · `model/` · `routes.ts` · `nav.ts`

## UI chrome

Prefer shared surface/list patterns from ui-kit; align polish with the accounting template where practical.

## Related

- `@inventory-platform/session` — shop context
- `@inventory-platform/api-client`
