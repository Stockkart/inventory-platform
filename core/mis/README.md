# @inventory-platform/mis

Management Information System reports: vendor money, customer money, sales, and stock.

## Owns

- Routes `/dashboard/mis/*`
- Nav group **MIS** (`requiredCapability: 'mis'`)
- `/mis/*` APIs + Query hooks
- Excel / PDF export downloads

## Does not own

- Double-entry accounting (`core/accounting`)
- Analytics charts (`core/analytics`)

## Layout

`api/` · `queries/` · `pages/` · `ui/` · `routes.ts` · `nav.ts`
