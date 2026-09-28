# @inventory-platform/admin

StockKart admin accounts and the admin app chrome. Admins are separate from shop users: their own
collection on the API (`admin_users`), their own email + password sign-in, and their own app
(`apps/admin`, port 4400). A shop sign-in never grants admin access, and an admin session is never
accepted by shop APIs.

## Owns

- Sign-in (`/login`) and change password (`/change-password`, forced after a temporary password)
- Session guard: `useAdminSession` + the pure `adminRedirect` rules
- `AdminLayout` — admin header and tool sidebar (`ADMIN_NAV`)
- Admins page (`/admins`) — add an admin (issues a one-time temporary password), turn off / on,
  reset password
- `/admin/auth/*` and `/admin/admins/*` APIs + Query hooks

## Does not own

- The admin tools themselves (MIS, referrals, vouchers, campaigns, catalogue) — they live in
  `core/plan` and are mounted inside `AdminLayout` by `plugin-registry/admin-routes`

## Session

The admin token is stored by `apiClient` like the shop token, but the admin app runs on its own
origin, so the two never share storage. A 401 anywhere clears the token and returns to `/login`.
When `mustChangePassword` is set, every page except change password redirects there.

## Layout

`api/` · `queries/` · `session/` · `forms/` · `pages/` · `ui/` · `routes/` · `routes.ts` · `nav.ts`
