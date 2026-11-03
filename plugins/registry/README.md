# @inventory-platform/plugin-registry

**Status:** Active

Composes dashboard **nav** and **routes** from core contributions + the active vertical plugin. Owns public (pre-auth) route wiring helpers used by the inventory app.

## Owns

- Vertical plugin loader registration (`registerVerticalPluginLoader`, `loadVerticalPlugin`)
- Composed nav (`COMPOSED_DASHBOARD_MENU_GROUPS`, role filters, merge helpers)
- Composed dashboard routes / sell-surface helpers
- Public routes module for journeys (login, marketing, onboarding entry)
- Composed Profile tabs (`profile-tabs.ts`): Barcode labels, Product cards and Rate rules, registered into `core/user`'s tab registry after the Invoice tab in that order. The Rate rules tab renders `RateRulesSection` from `@inventory-platform/product` and is hidden when the API says rate rules are off for the shop's vertical (`enabled: false`, e.g. cafe), through the extension's `useVisible` hook (`useRateRulesAvailable`). While the rules load, or if they fail to load, the tab shows. A `?tab=rate-rules` link on a shop where the tab is hidden opens the Shop tab instead.

## Does not own

- Plugin page implementations (`plugins/cafe`, …)
- Dashboard layout chrome (`platform/shell`)
- Domain `nav.ts` / `routes.ts` contents (`core/*`)

## Usage

1. Domains export `NavContribution` + `RouteModule[]`.
2. Registry merges core nav and, when a vertical is active, loads that plugin and merges its routes/nav.
3. Shell renders the composed menu; the app route tree mounts composed modules.

## Related

- `@inventory-platform/routing` — types
- `@inventory-platform/shell` — layout
- `@inventory-platform/plugin-cafe` — first vertical
