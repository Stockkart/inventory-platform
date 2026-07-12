# @inventory-platform/shell

**Status:** Active

Authenticated app chrome: dashboard layout, sidebar/nav rendering, header actions, toasts, command palette hooks, contextual help, and overview widgets.

## Owns

- `DashboardLayout` and related shell UI
- Notification panel UI (data wiring may stay here until `core/notifications` exists)
- Contextual help drawer + tutorial resources API usage
- Shell routes (e.g. dashboard home) via `routes.ts`
- Composition helpers consumed with `plugin-registry`

## Does not own

- Domain pages (imported via route modules)
- Design tokens / primitives (`ui-kit`)
- Auth journey pages (`core/user`)

## UI chrome

`AppShell`, `shellChrome` from `@inventory-platform/ui-kit`.

## Related

- `@inventory-platform/plugin-registry` — composed nav + vertical routes
- `@inventory-platform/session`
- `@inventory-platform/routing` — types
