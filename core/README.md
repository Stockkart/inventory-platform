# Core domains

Business feature packages for StockKart. Each domain owns its API client wrappers, TanStack Query hooks, pages, routes, and nav contributions.

## Package index

| Package                           | npm name                            | Status        | Owns (summary)                                            |
| --------------------------------- | ----------------------------------- | ------------- | --------------------------------------------------------- |
| [accounting](./accounting/)       | `@inventory-platform/accounting`    | Migrated      | Journal, ledger, COA, P&L, parties                        |
| [analytics](./analytics/)         | `@inventory-platform/analytics`     | Migrated      | Sales / profit / inventory / vendor / customer analytics  |
| [checkout](./checkout/)           | `@inventory-platform/checkout`      | Scaffold only | Placeholder — real checkout UI still under `core/product` |
| [credit](./credit/)               | `@inventory-platform/credit`        | Migrated      | Credit balances, charges, settlements                     |
| [notifications](./notifications/) | `@inventory-platform/notifications` | Scaffold only | Placeholder — bell UI lives in `platform/shell`           |
| [plan](./plan/)                   | `@inventory-platform/plan`          | Migrated      | Plan status, payment, marketing surfaces                  |
| [pricing](./pricing/)             | `@inventory-platform/pricing`       | Migrated      | Pricing list + price edit                                 |
| [product](./product/)             | `@inventory-platform/product`       | Migrated      | Registration, search, scan-sell, returns, history         |
| [reminders](./reminders/)         | `@inventory-platform/reminders`     | Migrated      | Reminders + inventory alerts                              |
| [taxation](./taxation/)           | `@inventory-platform/taxation`      | Migrated      | GSTR reports                                              |
| [user](./user/)                   | `@inventory-platform/user`          | Migrated      | Auth journeys, shops, profile, customers/vendors, team    |

## Standard layout

```text
core/<domain>/src/
├── api/          # REST wrappers (via @inventory-platform/api-client)
├── queries/      # Query keys + hooks
├── pages/        # Route-level screens
├── ui/           # Domain-only widgets
├── routes/       # Lazy route modules
├── routes.ts     # RouteModule definitions
├── nav.ts        # NavContribution(s)
├── model/        # Domain types / helpers
└── index.ts      # Public barrel
```

## Rules

- Domains must not import each other’s internal files. Cross-domain UI goes through a **public** export if needed.
- Prefer ui-kit chrome over new CSS modules for layout polish.
- Register routes via the app / `plugin-registry` composer — do not add ad-hoc dashboard packages.

See [FRONTEND_MONOREPO_REDESIGN.html](../../docs_stockkart/FRONTEND_MONOREPO_REDESIGN.html) for migration history and next-plan status.
