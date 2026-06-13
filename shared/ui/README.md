# @inventory-platform/ui

Shared React components and form utilities.

## Vertical schema UI (Phase 2–3)

| Module | Purpose |
|--------|---------|
| `verticalSchemaUtils.ts` | `getDynamicInventoryFields` (extension + companyName), `registrationFieldsForBilling`, `isRegistrationSchemaReady`, validation helpers |
| `VerticalSchemaFieldInput.tsx` | Renders string / date / enum inputs from `VerticalSchemaFieldDef` |
| `VerticalInventoryFields.tsx` | Row/stack layout for multiple schema fields |

Import types from `@inventory-platform/types`; fetch schemas via `@inventory-platform/store` (`useVerticalSchemaStore`).

## Running unit tests

Run `nx test @inventory-platform/ui` to execute the unit tests via [Jest](https://jestjs.io).
