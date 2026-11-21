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

## Trial length

Trial badges and the My Plan trial line read the trial length from the API (`trialDays` on the plan list and on plan status, inventory-api `plan.trial-days`) through `trialLabel` / `freeTrialLabel` (`ui/trialLabel.ts`); an older API without the field shows "Free trial" with no number. ui-kit `PlanCard` takes the text as `trialLabel`.

## Related

- `@inventory-platform/contracts` — plan types / guards
- `@inventory-platform/session` — plan status for access

## Sale banner

`CampaignBanner` shows the active campaign as a scrolling strip on My Plan and on the public landing and plans pages. It has no close button, so the offer stays visible while the campaign runs. The campaign's `dismissible` field is still stored by the API but the UI no longer reads it, and the admin form no longer shows it.

## Plan comparison

`buildPlanComparison` (`ui/planPricing.ts`) builds the `/plans` table in the 2026 brochure's sections. "Billing & stock" rows are fixed text because every plan includes them; every other row comes from the plan API: `features`, `roleLimit` ("Limited (2 roles)" / "Advanced") and `attendanceUserLimit` ("Up to 4 users"), needing inventory-api #341. Rows no plan includes are hidden, so the table degrades cleanly on an older API.

## Add-ons & top-ups (add-on-only orders)

On an active paid plan (`canBuyAddOnsAlone`: not trial, not expired, has a plan) My Plan shows a collapsed **Add-ons & top-ups** disclosure above "Available plans". It renders nothing on a trial, an expired plan or no plan. Opening it loads `GET /plans/addons` and lists `topUpAddOns` (the same filter as checkout: feature add-ons the plan already includes and seats on unlimited plans are hidden). Each card shows the catalogue price label and what one unit gives (`addOnGrantLabel`); stackable add-ons get a stepper capped at `maxQuantity` (UI bound only, the API validates).

**Buy** opens `/dashboard/plan-payment?addOn=CODE&qty=N` with no `planId`. `readAddOnOnlyIntent` reads that as an add-on-only order: the page builds a cart with no plan (`buildAddOnOnlyRequest`), prices it with `POST /plans/orders/quote`, shows the server's lines and totals, and checks out through the usual Razorpay / wallet flow, then returns to My Plan. The link is never trusted as-is: `resolveAddOnOnlyIntent` waits for plan status and the catalogue, shows "Back to My Plan" with an explanation when the shop cannot buy add-ons alone (trial, expired, no plan), shows "This add-on isn't available for your plan" and leaves the cart empty when the code is not a buyable top-up (already included, unknown, or coming soon), and otherwise seeds the cart once with the quantity held to the stepper cap. When the quote carries `termEndsAt` (annual add-ons end on the current plan's term, full price, no proration), the page shows "Valid until <date>" (Indian calendar day, `formatTermEnd`); older APIs omit it and nothing is shown. API errors (for example "Add-ons can be bought on their own only on an active paid plan") show in an Alert. A `planId` in the URL always means the plan flow, unchanged. Add-on-only orders have no term (quote `durationMonths: 0`, stored order `null`), so no duration is shown; an empty cart is never sent (the API would answer "Choose a plan or at least one add-on"). Needs the inventory-api add-on-only quote/checkout (`addOnOnly` on the responses).

## Payment page states

- Pay button text and caption come from `pricedPayLabel` / `payCaption` (`checkout/payButton.ts`), fed only by server totals. A ₹0 order (wallet and/or vouchers cover it) is "Pay with wallet credit" or "Confirm order", never "Pay ₹0", and does not mention Razorpay: the API settles it with provider `wallet`.
- A failed quote shows "Could not price your order" on the button and a **Try again** button (`refetch`). A `VOUCHER_REJECTED` that names no voucher clears every applied voucher (`vouchersAfterRejection`). A rejection that leaves nothing to drop (the code is not applied) is shown as a quote failure with **Try again** (`quoteFailureMessage`), so the button never stays on "Pricing your order…".
- The idempotency key covers the cart and the quoted `grandTotal` / `walletCredit` (`checkoutFingerprint`): the same cart at the same price replays the open order, a changed price opens a new one. After a failed or closed checkout the wallet and quote are refetched, since the abandoned order can hold wallet credit.
- The order `phase` from checkout, verify and cancel decides what happens next (`orderStage`, `checkout/orderState.ts`; the raw `status` on an older API): AWAITING_PAYMENT opens Razorpay; PROCESSING shows "Payment received, confirming…" with **Check again** and never reopens Razorpay (a replayed idempotency key returns the order as it is now); FULFILLED finishes; FAILED / ENDED say the order was closed and the next attempt opens a new one.
- Closing the Razorpay window cancels the unpaid order (`POST /plans/orders/{orderId}/cancel`), so its wallet credit and vouchers come back at once. If that cancel fails, the order stays open and the next Pay replays it with the same idempotency key at the price it was opened at. A failed attempt inside the Razorpay window no longer ends the checkout; its message is shown only once the window is closed (`PaymentDismissedError.lastFailure`).
- When Razorpay took the payment but verify failed, the page keeps the Razorpay result and shows **Confirm payment**, which retries the verification alone.
- If the checkout `amount` of a new order differs from the quoted `grandTotal`, Razorpay is not opened: that order is cancelled, the quote is refetched and the new total shown, to pay again.
- After paying, plan queries are invalidated except quotes (`isPlanDataExceptQuote`), so the paid cart is not priced again on the way out. Payment errors show under the Pay button.

## Coming soon: SMS and WhatsApp

StockKart does not send SMS or WhatsApp yet. Every SMS / WhatsApp allowance carries the amber "Coming soon" badge (`surfaceChrome.planComingSoon`): plan card lines (`buildPlanFeatures` returns `{ label, comingSoon }`, rendered by `PlanGrid` and the ui-kit `PlanCard`), the "SMS per month" / "WhatsApp per month" rows of the comparison table, the My Plan usage tiles, and `grantType: 'SMS'` add-ons (shown, but Buy and the checkout checkbox are disabled; the API rejects them with "SMS packs are coming soon").

## Tests

`nx test plan` runs `src/**/*.test.ts(x)` with the same setup as `core/user` (`vitest.config.ts`, `vitest.setup.ts`, `tsconfig.spec.json`): `src/ui/**` in jsdom, everything else in node. CI runs it with every other test target.
