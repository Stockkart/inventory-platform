# @inventory-platform/session

**Status:** Active

Client session state: authentication, current shop, capabilities, vertical schema cache, plan status mirrors, and toast/notify helpers.

## Owns

- Zustand (or equivalent) stores for auth / shop / capabilities / schema / access / plan status
- Session-facing API helpers used at bootstrap (login, me, logout)
- `useNotify` / toast store wiring consumed by shell

## Does not own

- Dashboard chrome UI (`platform/shell`)
- Domain CRUD APIs (`core/*`)

## Related

- `@inventory-platform/api-client`
- `@inventory-platform/shell` — layout consumes session
- `@inventory-platform/user` — journey auth forms call into session
