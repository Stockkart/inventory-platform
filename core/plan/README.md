# @inventory-platform/plan

**Status:** Migrated

Subscription plans: status, payment flow, and marketing/landing plan surfaces.

## Owns

- Routes `/dashboard/plan-status`, `/dashboard/plan-payment`
- Nav group **Plan & Billing**
- Plans API, payment helpers, guards
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

## Related

- `@inventory-platform/contracts` — plan types / guards
- `@inventory-platform/session` — plan status for access

## Sale banner

`CampaignBanner` shows the active campaign as a scrolling strip on My Plan and on the public landing and plans pages. It has no close button, so the offer stays visible while the campaign runs. The campaign's `dismissible` field is still stored by the API but the UI no longer reads it, and the admin form no longer shows it.

## Plan comparison

`buildPlanComparison` (`ui/planPricing.ts`) builds the `/plans` table in the 2026 brochure's sections. "Billing & stock" rows are fixed text because every plan includes them; every other row comes from the plan API: `features`, `roleLimit` ("Limited (2 roles)" / "Advanced") and `attendanceUserLimit` ("Up to 4 users"), needing inventory-api #341. Rows no plan includes are hidden, so the table degrades cleanly on an older API.

## Tests

`nx test plan` runs `src/**/*.test.ts(x)` with the same setup as `core/user` (`vitest.config.ts`, `vitest.setup.ts`, `tsconfig.spec.json`): `src/ui/**` in jsdom, everything else in node. CI runs it with every other test target.
