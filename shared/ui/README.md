# @inventory-platform/ui

Shared React components and form utilities.

## Vertical schema UI (Phase 2)

| Module | Purpose |
|--------|---------|
| `verticalSchemaUtils.ts` | Field labels, `getDynamicInventoryFields`, `registrationFieldsForBilling`, `buildVerticalFieldsPayload`, validation helpers |
| `VerticalSchemaFieldInput.tsx` | Renders string / date / enum inputs from `VerticalSchemaFieldDef` |
| `VerticalInventoryFields.tsx` | Row/stack layout for multiple schema fields |

Import types from `@inventory-platform/types`; fetch schemas via `@inventory-platform/store` (`useVerticalSchemaStore`).

## Running unit tests

Run `nx test @inventory-platform/ui` to execute the unit tests via [Jest](https://jestjs.io).
