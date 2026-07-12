# @inventory-platform/routing

**Status:** Active

Shared routing / navigation / plugin **types** and small helpers (not the React Router app).

## Owns

- `RouteModule`, `NavContribution`, `VerticalPlugin`, loader types
- Plugin registry primitives used by `plugin-registry`

## Does not own

- Actual route files (`apps/inventory`, `core/*/routes.ts`)
- Dashboard layout (`platform/shell`)

## Related

- `@inventory-platform/plugin-registry` — composition
- `@inventory-platform/shell` — renders nav rows
