# @inventory-platform/plan

**Status:** Migrated

Subscription plans: status, payment flow, and marketing/landing plan surfaces.

## Owns

- Routes `/dashboard/plan-status`, `/dashboard/plan-payment`
- Nav group **Plan & Billing**
- Plans API, payment helpers, guards
- Shop entitlements query (`useShopEntitlementsQuery`, key `planKeys.shopEntitlements(shopId)`). The dashboard layout passes it to the shell for nav and route gating. A verified payment invalidates `planKeys.all`, so the nav shows the new plan without a reload. The key carries the shop id, so a shop switch or a login as another shop never reads the previous shop's entitlements.
- Marketing UI pieces used on public/plan pages
- Admin tool pages (MIS, referral operations, vouchers, campaigns, catalogue) as `planAdminToolRoutes`, mounted only in the admin app (`apps/admin`). The shop app has no admin routes or nav.

## Does not own

- Auth/session plan-status store (session may mirror status for gating)
- Generic marketing chrome primitives (`ui-kit` Marketing\*)

## Layout

`api/` · `queries/` · `pages/` · `ui/` · `marketing/` · `payment/` · `guards/` · `routes.ts` · `nav.ts`

## UI chrome

Use ui-kit marketing patterns (`PlanCard`, `MarketingHero`, …) and solid buttons for in-dashboard actions.

My Plan (`PlanStatusPage`) uses the `surfaceChrome.planStatus*` / `planUsage*` / `planFeature*` classes: a brand-navy current-plan card, one row of usage tiles, and a tick-list of features, following the 2026 brochure.

The landing-page carousel (ui-kit `PlanCard`) and the `/plans` cards (`surfaceChrome.planCard*`) share the brochure look: amber "Most popular" pill, 2px navy border on the highlighted plan, navy plan name, green tick circles. Change both together.

## Trial length

Trial badges and the My Plan trial line read the trial length from the API (`trialDays` on the plan list and on plan status, inventory-api `plan.trial-days`) through `trialLabel` / `freeTrialLabel` (`ui/trialLabel.ts`); an older API without the field shows "Free trial" with no number. ui-kit `PlanCard` takes the text as `trialLabel`.

## Related

- `@inventory-platform/contracts` — plan types / guards
- `@inventory-platform/session` — plan status for access

## Sale banner

`CampaignBanner` shows the active campaign as a scrolling strip on My Plan and on the public landing and plans pages. It has no close button, so the offer stays visible while the campaign runs. The campaign's `dismissible` field is still stored by the API but the UI no longer reads it, and the admin form no longer shows it.

## Tests

`nx test plan` runs `src/**/*.test.ts(x)` with the same setup as `core/user` (`vitest.config.ts`, `vitest.setup.ts`, `tsconfig.spec.json`): `src/ui/**` in jsdom, everything else in node. CI runs it with every other test target.

## Wallet adjustments (admin)

Referral operations → Wallet: the admin types a signed amount and presses **Review credit/debit**. A `ReasonDialog` shows the shop, the amount and the balance before → after from `POST /admin/wallets/{shopId}/adjustments/preview`; **Confirm** stays disabled until the API says the adjustment is allowed (it caps one adjustment) and a reason is typed. The same adjustment id is kept across retries so it is applied once.

## Usage tiles

The seat and scan tiles on My Plan turn red only on the API's `seatLimitReached` / `ocrLimitReached` (entitlements response); the page never compares usage with limits itself.

## Add-on catalogue (admin)

The add-on form sends what the admin chose; the API derives `billingType` from the grant type (OCR credits one-time, the rest annual) and, for a feature add-on, `grantsQuantity` 1 and not stackable, and rejects contradictory combinations (`toAddOnRequest` no longer sets them).

## Plan grants (admin)

Plans & add-ons → **Shop plan & add-ons**: after looking up a shop, **Grant a plan** (`PlanGrantForm`) takes a plan (the plan list's selectable plans, `planGrantOptions`), 1–36 months and a reason (at most 200 characters). **Review grant** opens a confirm dialog that repeats the shop, plan, months and reason; **Grant plan** sends `POST /admin/shops/{shopId}/plan-grants` and shows the plan and expiry from the returned plan status. The API decides the term (the same plan extends from the current expiry) and refuses another plan while paid days remain; its message is shown in the dialog.
