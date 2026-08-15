# @inventory-platform/mis

Management Information System reports: vendor money, customer MIS (ledger + daily sales), and stock.

## Owns

- Routes `/dashboard/mis/*`
- Nav group **MIS** (`requiredCapability: 'mis'`)
- `/mis/*` APIs + Query hooks
- Excel / PDF export downloads

Customer MIS (`/dashboard/mis/customer-money`) has two tabs: **Customer money** (ledger) and **Sales** (one row per day). Download Excel is one workbook with both sheets. `/dashboard/mis/sales` redirects to the Sales tab.

## Does not own

- Double-entry accounting (`core/accounting`)
- Analytics charts (`core/analytics`)

## Layout

`api/` · `queries/` · `pages/` · `ui/` · `routes.ts` · `nav.ts`
