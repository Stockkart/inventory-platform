# @inventory-platform/plan

**Status:** Migrated

Subscription plans: status, payment flow, and marketing/landing plan surfaces.

## Owns

- Routes `/dashboard/plan-status`, `/dashboard/plan-payment`
- Nav group **Plan & Billing**
- Plans API, payment helpers, guards
- Marketing UI pieces used on public/plan pages

## Does not own

- Auth/session plan-status store (session may mirror status for gating)
- Generic marketing chrome primitives (`ui-kit` Marketing\*)

## Layout

`api/` · `queries/` · `pages/` · `ui/` · `marketing/` · `payment/` · `guards/` · `routes.ts` · `nav.ts`

## UI chrome

Use ui-kit marketing patterns (`PlanCard`, `MarketingHero`, …) and solid buttons for in-dashboard actions.

## Related

- `@inventory-platform/contracts` — plan types / guards
- `@inventory-platform/session` — plan status for access

## Tests

`nx test plan` runs `src/**/*.test.ts(x)` with the same setup as `core/user` (`vitest.config.ts`, `vitest.setup.ts`, `tsconfig.spec.json`): `src/ui/**` in jsdom, everything else in node. CI runs it with every other test target.

## Wallet adjustments (admin)

Referral operations → Wallet: the admin types a signed amount and presses **Review credit/debit**. A `ReasonDialog` shows the shop, the amount and the balance before → after from `POST /admin/wallets/{shopId}/adjustments/preview`; **Confirm** stays disabled until the API says the adjustment is allowed (it caps one adjustment) and a reason is typed. The same adjustment id is kept across retries so it is applied once.

## Usage tiles

The seat and scan tiles on My Plan turn red only on the API's `seatLimitReached` / `ocrLimitReached` (entitlements response); the page never compares usage with limits itself.

## Add-on catalogue (admin)

The add-on form sends what the admin chose; the API derives `billingType` from the grant type (OCR credits one-time, the rest annual) and, for a feature add-on, `grantsQuantity` 1 and not stackable, and rejects contradictory combinations (`toAddOnRequest` no longer sets them).
