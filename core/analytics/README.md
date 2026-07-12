# @inventory-platform/analytics

**Status:** Migrated

Sales, profit, inventory, vendor, and customer analytics dashboards (charts + KPI cards).

## Owns

- Route `/dashboard/analytics`
- Nav item **Analytics**
- Analytics REST (`/analytics/*`) + Query hooks
- Chart components (Recharts) and filter bars

## Does not own

- Transactional history list (`core/product` History)
- Expiry reminder cards (`core/reminders`)

## Layout

`api/` · `queries/` · `pages/` · `ui/` · `routes.ts` · `nav.ts`

## UI chrome

Use `chartChrome` from ui-kit. Plot wrappers must use `chartChrome.plot` (fixed height) so `ResponsiveContainer` does not collapse to 0 height.

In-app filter actions: `Button variant="solid"`.

## Related

- `@inventory-platform/ui-kit` (`chartChrome`)
- Backend `/analytics/*` controllers
