# @inventory-platform/reminders

**Status:** Migrated

Operational reminders and inventory alert views (including expiry-oriented summaries).

## Owns

- Routes `/dashboard/reminders`, `/dashboard/inventory-alert`
- Nav group **Reminders & Alerts**
- Reminders / alert APIs + Query hooks
- Domain list UI

## Does not own

- Analytics expiry buckets charting (`core/analytics` may show related metrics)
- Notification bell dropdown (`platform/shell`)

## Layout

`api/` · `queries/` · `pages/` · `ui/` · `routes.ts` · `nav.ts`

## Related

- `@inventory-platform/schema` / inventory search filters where expiry fields apply
- ui-kit list patterns (`PageHeader`, `Table`, `PaginationBar`)
