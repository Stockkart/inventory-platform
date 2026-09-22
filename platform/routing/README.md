# @inventory-platform/routing

**Status:** Active

Shared routing / navigation / plugin **types**, small helpers, and the vertical UI slots the
Sell screen renders (not the React Router app).

## Owns

- `RouteModule`, `NavContribution`, `VerticalPlugin`, loader types
- Plugin registry primitives used by `plugin-registry`
- `VerticalSellActions` — the first vertical UI slot: renders the lazily loaded components a
  vertical contributes through `VerticalPlugin.sellActions` (cafe's Print KOT), so `core/product`
  can host vertical UI on the Sell screen without importing `plugins/*`. The contributed array
  must be referentially stable — see the JSDoc on `VerticalPlugin.sellActions`.

## Does not own

- Actual route files (`apps/inventory`, `core/*/routes.ts`)
- Dashboard layout (`platform/shell`)

## Related

- `@inventory-platform/plugin-registry` — composition
- `@inventory-platform/shell` — renders nav rows
