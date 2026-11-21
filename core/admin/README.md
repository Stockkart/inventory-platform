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

The admin token is kept by `apiClient` in localStorage under its own key, `stockkart_admin_token`
(`session/adminToken.ts` calls `apiClient.setTokenStorageKey` before the first admin request), never
the shop app's `auth_token`; the admin app also runs on its own origin. Only a 401 means signed out:
it clears the token and returns to `/login`. Any other failure of the session check (server error,
offline) keeps the admin signed in and shows "Could not reach StockKart" with **Try again**
(`adminSessionStatus`, `SessionUnavailable`).
When `mustChangePassword` is set, every page except change password redirects there.

## Hosting

`apps/admin` is its own Netlify site (`apps/admin/netlify.toml`: static SPA, every path served
`index.html`). It needs `VITE_API_URL`, and the API's `ADMIN_CLIENT_URL` set to the site's origin.
See `docs/deploying.md`, "Admin app".

## Tests

`nx test admin` (`vitest.config.ts` copied from `core/user`).

## Layout

`api/` · `queries/` · `session/` · `forms/` · `pages/` · `ui/` · `routes/` · `routes.ts` · `nav.ts`
