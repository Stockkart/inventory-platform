# @inventory-platform/taxation

**Status:** Migrated

GST reporting surfaces: GSTR-1, GSTR-2, GSTR-3B tabs and downloads.

## Owns

- Route `/dashboard/taxes`
- Nav group **Taxes**
- GSTR APIs + Query hooks
- Report tab UI + shared tax CSS modules

## Does not own

- Invoice creation / scan-sell tax lines (`core/product`)
- Chart of accounts tax mapping (`core/accounting`)

## Layout

`api/` · `queries/` · `pages/` · `ui/` · `routes.ts` · `nav.ts`

## Related

- `@inventory-platform/api-client`
- ui-kit tabs / tables for report chrome polish
