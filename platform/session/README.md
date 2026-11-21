# @inventory-platform/session

**Status:** Active

Client session state: authentication, current shop, capabilities, vertical schema cache, plan status mirrors, and toast/notify helpers.

## Owns

- Zustand (or equivalent) stores for auth / shop / capabilities / schema / access / plan status
- Session-facing API helpers used at bootstrap (login, me, logout)
- `useNotify` / toast store wiring consumed by shell. A toast with the same type and message as one already on screen is not added again.
- Plan expiry per shop (`isShopPlanExpired`): set from `/plans/shop/status` and by `markPlanExpired()` when the API refuses a call as plan-expired (402)

## Tests

`vitest.config.ts` (node, copied from `platform/shell`) runs the store tests, e.g. `src/lib/useToastStore.test.ts`.

## Does not own

- Dashboard chrome UI (`platform/shell`)
- Domain CRUD APIs (`core/*`)

## Related

- `@inventory-platform/api-client`
- `@inventory-platform/shell` — layout consumes session
- `@inventory-platform/user` — journey auth forms call into session
