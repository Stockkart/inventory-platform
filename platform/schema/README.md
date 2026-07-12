# @inventory-platform/schema

**Status:** Active

Renders **vertical-specific** shop/product fields from API schema definitions (no hardcoded pharmacy-only forms).

## Owns

- `VerticalSchemaFieldInput` and field label helpers
- Inventory / onboarding field grouping utilities
- Schema-related types re-exported for consumers

## Does not own

- Fetching/caching schema documents (`platform/session` store + verticals API)
- Product registration page layout (`core/product`)

## Related

- `@inventory-platform/session` — `useVerticalSchemaStore`
- `@inventory-platform/user` — onboarding
- `@inventory-platform/product` — registration / search
