# @inventory-platform/schema

**Status:** Active

Renders **vertical-specific** shop/product fields from API schema definitions (no hardcoded pharmacy-only forms).

## Owns

- `VerticalSchemaFieldInput` and field label helpers
- Inventory / onboarding field grouping utilities
- Schema-related types re-exported for consumers

## Registration readiness

- `isRegistrationSchemaLoaded` — the shop schema for this shop and billing mode has arrived (it may have no fields).
- `isRegistrationSchemaReady` — loaded **and** has at least one registration field. Product Entry shows its field grid only when this is true.
- Loaded but not ready means the vertical seed tags no fields for that mode. Product Entry shows "No product fields set up" instead of a spinner; fix the seed in `inventory-api`.

## Tests

`vite.config.mts` is test-only. Run `./node_modules/.bin/vitest run --root platform/schema --config vite.config.mts`.

## Does not own

- Fetching/caching schema documents (`platform/session` store + verticals API)
- Product registration page layout (`core/product`)

## Related

- `@inventory-platform/session` — `useVerticalSchemaStore`
- `@inventory-platform/user` — onboarding
- `@inventory-platform/product` — registration / search
