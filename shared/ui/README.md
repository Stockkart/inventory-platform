# @inventory-platform/ui

Shared React components and form utilities.

## Vertical schema UI (Phases 2–4)

| Module | Purpose |
|--------|---------|
| `verticalSchemaUtils.ts` | `getDynamicInventoryFields`, `attachVerticalFieldsToBulkItem`, `setVerticalFieldPatch`, `formatCoreExpiryDateForApi`, `itemUsesExtensionBag`, validation helpers |
| `VerticalSchemaFieldInput.tsx` | Renders string / date / enum inputs from `VerticalSchemaFieldDef` |
| `VerticalInventoryFields.tsx` | Row/stack layout for multiple schema fields |

Import types from `@inventory-platform/types`; fetch schemas via `@inventory-platform/store` (`useVerticalSchemaStore`).

**Write rule (Phase 3):** extension fields (`batchNo`, `expiryDate`, …) go in `verticalFields` on API requests — never duplicated at top level when `storage: extension`.

## Running unit tests

Run `nx test @inventory-platform/ui` to execute the unit tests via [Jest](https://jestjs.io).
