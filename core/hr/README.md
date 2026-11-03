# @inventory-platform/hr

**Status:** Scaffold (HR module in progress, spec `.kiro/specs/hr-module`)

Staff records, attendance, leave, payroll, salary advances and staff self-service ("My HR").

## Owns

- Routes `/dashboard/hr/*` (employees, attendance, leave, payroll, advances, me) — not registered yet
- Nav group **HR** (`hrNav`) — not wired into `plugins/registry` yet
- `useHrAccess` (`can(permission)`, `employeeId`, `isOwner`) for showing/hiding buttons
- HR APIs + Query hooks (keys always start `['hr', shopId, ...]`)

## Does not own

- Permission types in `/shops/me/access` (`HrAccess`, `HrPermission` live in `@inventory-platform/access`)
- Nav/path gating (`platform/shell/src/lib/accessNav.ts`)
- Shared calendar, month picker and permission grid widgets (`@inventory-platform/ui-kit`)

## Layout

`access/` · `api/` · `model/` · `queries/` · `pages/` · `ui/` · `routes/` · `routes.ts` · `nav.ts`

## Tests

Vitest (config copied from `core/user`): `src/ui/**` runs in jsdom, everything else in node
(hook tests opt into jsdom with `// @vitest-environment jsdom`).
