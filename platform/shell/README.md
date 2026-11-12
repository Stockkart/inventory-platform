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

## Calculator

A desk calculator opens from the header button or `Alt+C` on every dashboard screen. It is a non-modal `FloatingPanel`, so the page underneath stays usable.

- `calculatorEngine.ts` — the arithmetic: chain evaluation left to right, contextual percent, memory, tape. Pure, tested in `calculatorEngine.test.ts`.
- `DashboardCalculator.tsx` — state, and persistence through `calculatorPanelState.ts` (tape, memory, position and open flag in `localStorage`, one key per shop). `DashboardLayout` keys it by shop id, so a shop switch saves the old shop's tape and loads the new one's.
- A panel left open comes back open on reload without taking focus.
- `isTypingInField` treats the panel as a typing surface, so `/`, `?` and single-key favourite shortcuts do not fire while it has focus. `Alt+C` is reserved against favourite-page shortcuts.

The calculator is a scratch tool. It never computes a bill, tax or total; those come from the API.

## UI chrome

`AppShell`, `shellChrome` from `@inventory-platform/ui-kit`.

## Related

- `@inventory-platform/plugin-registry` — composed nav + vertical routes
- `@inventory-platform/session`
- `@inventory-platform/routing` — types
