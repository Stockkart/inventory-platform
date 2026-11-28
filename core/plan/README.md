# @inventory-platform/plan

**Status:** Migrated

Subscription plans: status, payment flow, and marketing/landing plan surfaces.

## Owns

- Routes `/dashboard/plan-status`, `/dashboard/plan-payment`
- Nav group **Plan & Billing**
- Plans API, payment helpers, guards
- Shop entitlements query (`useShopEntitlementsQuery`, key `planKeys.shopEntitlements(shopId)`). The dashboard layout passes it to the shell for nav and route gating. A verified payment invalidates `planKeys.all`, so the nav shows the new plan without a reload. The key carries the shop id, so a shop switch or a login as another shop never reads the previous shop's entitlements.
- Marketing UI pieces used on public/plan pages

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

## Usage tiles

The seat and scan tiles on My Plan turn red only on the API's `seatLimitReached` / `ocrLimitReached` (entitlements response); the page never compares usage with limits itself.

The tiles read "Used 3 of 5 seats" and "Used 0 of 100 scans" (`usageOfLimit`; "Used 1,200 scans" when unlimited). While bought scan credits remain, the scan tile adds "500 bought scans left" from the entitlements `ocrTopUpRemaining` (`boughtScansLeftLabel`); an older API without the field shows nothing extra.

## Plan cards on My Plan

Plan status `planOptions` (inventory-api) gives each catalogue plan an `action`: `CURRENT` ("Renew plan"), `UPGRADE` ("Upgrade", a higher plan) or `BUY` ("Buy", a lower plan, or any plan without a paid plan). `planCardCta` (`ui/planCardCta.ts`) only maps that to the button; the page never compares prices or plan order. While the paid plan has days left the API marks other plans `actionAvailable: false` (a plan change waits for the paid plan to end, `PLAN_CHANGE_NOT_ALLOWED`): the button is disabled and its reason and "Available from <date>" show under it. The reason sits in its own row of the card (`planCardNote`; the card is a two-row CSS subgrid of the grid), so every button in a row of cards stays on one line whether or not it has a reason. The trial badge shows only when plan status says `trialAvailable`. Without `planOptions` (an older API, or the public `/plans` page) the cards keep the caller's `ctaLabel`.

## Wallet history

The Referrals page lists `GET /plans/shop/wallet` entries with their `availableDelta` and `availableAfter`. The API returns only rows that moved the available balance, so a paid order shows one "Used at checkout" row (its `ORDER_RESERVATION`) and no "+₹0.00" "Spent on a plan" row; an unpaid order that ended adds "Checkout hold released". Amounts use `formatRupees` (two decimals).

## Dates

Every plan-area date (My Plan "Renews"/"Expires", "Available from" on plan cards, past purchases, wallet history, add-on "Valid until") goes through `formatPlanDate` (`ui/planDate.ts`): the Indian calendar day as "21 Nov 2027", the day-month-year style the rest of the app shows. The API sends ISO instants only.
