# @inventory-platform/plan

**Status:** Migrated

Subscription plans: status, payment flow, and marketing/landing plan surfaces.

## Owns

- Routes `/dashboard/plan-status`, `/dashboard/plan-payment`
- Nav group **Plan & Billing**
- Plans API, payment helpers, guards
- Shop entitlements query (`useShopEntitlementsQuery`, key `planKeys.shopEntitlements(shopId)`). The dashboard layout passes it to the shell for nav and route gating. A verified payment invalidates `planKeys.all`, so the nav shows the new plan without a reload. The key carries the shop id, so a shop switch or a login as another shop never reads the previous shop's entitlements.
- Marketing UI pieces used on public/plan pages
- Admin tool API and Query hooks: `api/admin.api.ts`, `queries/admin.hooks.ts` (keys in `queries/keys.ts`); confirm dialogs use ui-kit `ReasonDialog`
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

On an active paid plan (plan status `canBuyAddOnsAlone`, decided by the API) My Plan shows a collapsed **Add-ons & top-ups** disclosure above "Available plans". It renders nothing on a trial, an expired plan or no plan. Opening it loads `GET /plans/addons` and lists the add-ons from `GET /plans/shop/addon-options` that the API marks eligible (`topUpAddOns`). Each card shows the catalogue price label and what one unit gives (`addOnGrantLabel`); stackable add-ons get a stepper capped at `maxQuantity` (UI bound only, the API validates).

**Buy** opens `/dashboard/plan-payment?addOn=CODE&qty=N` with no `planId`. `readAddOnOnlyIntent` reads that as an add-on-only order: the page builds a cart with no plan (`buildAddOnOnlyRequest`), prices it with `POST /plans/orders/quote`, shows the server's lines and totals, and checks out through the usual Razorpay / wallet flow, then returns to My Plan. The link is never trusted as-is: `resolveAddOnOnlyIntent` waits for plan status and the catalogue, shows "Back to My Plan" with an explanation when the shop cannot buy add-ons alone (trial, expired, no plan), shows "This add-on isn't available for your plan" and leaves the cart empty when the code is not a buyable top-up (already included, unknown, or coming soon), and otherwise seeds the cart once with the quantity held to the stepper cap. When the quote carries `termEndsAt` (annual add-ons end on the current plan's term, full price, no proration), the page shows "Valid until <date>" (Indian calendar day, `formatTermEnd`); older APIs omit it and nothing is shown. API errors (for example "Add-ons can be bought on their own only on an active paid plan") show in an Alert. A `planId` in the URL always means the plan flow, unchanged. Add-on-only orders have no term (quote `durationMonths: 0`, stored order `null`), so no duration is shown; an empty cart is never sent (the API would answer "Choose a plan or at least one add-on"). Needs the inventory-api add-on-only quote/checkout (`addOnOnly` on the responses). **Use wallet credit** works for every add-on-only cart, a scan pack alone too: the page only sends `applyWalletCredit` and shows the quote's `walletCredit` and `grandTotal`; a cart the wallet covers in full is paid with provider `wallet` (no Razorpay). Needs inventory-api with wallet credit on OCR scan packs.

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

## Past purchases

`PlanPaymentPage` lists purchases with `PastPurchases` (replacing "Transaction History"), newest first as the API returns them: plan orders, add-on-only orders and admin-assigned plans (amount shown as "—"). `purchaseHistory.ts` only formats labels (title, period with "≈" when the term is estimated, refund text, status tag such as "Processing" / "Needs attention"); every figure comes from `GET /plans/shop/transactions`. Expanding a row shows the line breakdown when the API kept one. `VoucherField` shows "Applies to <plan>" for a plan-target voucher and "₹X off <plan>" once the quote carries that voucher's line discount.

## Plan vouchers (admin)

The admin **Vouchers** page (`VouchersAdminPage`) and `GenerateVoucherModal` create vouchers for an add-on or for a plan. **Applies to** (a `FormField required` over the ui-kit `Select`) switches the form between the two; `withTarget` (`voucherForm.ts`) resets the fields that only make sense for the other target, and a plan voucher is a percent or flat discount on one plan chosen from the plan catalogue.

For a plan target the modal shows a live preview from `POST /admin/vouchers/plan-preview` (`usePlanVoucherPreview`, debounced 300 ms by ui-kit `useDebouncedValue`). The API decides what the discount comes to and whether it is allowed (for example a percent over the plan's allowed maximum); `describePlanVoucherPreview` only turns that answer into text. **Create** stays disabled while the preview is loading, behind what was typed, failed, or says the voucher is not allowed, so a voucher the API would reject cannot be submitted. No discount maths happens in the frontend. The value field only checks that it is a plain number with up to two decimals above 0 (`parseVoucherValue`); the API validates the rest. The list filters by **Applies to** and by add-on; the add-on filter is disabled while Plan is chosen. The list is paged (`GET /admin/vouchers` with `page` from 0 and `size` 100, `VOUCHER_PAGE_SIZE`): **Previous** / **Next** under the table, **Next** off when a page comes back shorter than `size` (`isLastVoucherPage`), and changing a filter goes back to the first page. Rows show the target (`describeVoucherTarget`). Shops redeem a plan voucher on the payment page (see `VoucherField` under Past purchases).

## Tests

`nx test plan` runs `src/**/*.test.ts(x)` with the same setup as `core/user` (`vitest.config.ts`, `vitest.setup.ts`, `tsconfig.spec.json`): `src/ui/**` in jsdom, everything else in node. CI runs it with every other test target.

## Wallet adjustments (admin)

Referral operations → Wallet: the admin types a signed amount and presses **Review credit/debit**. A `ReasonDialog` shows the shop, the amount and the balance before → after from `POST /admin/wallets/{shopId}/adjustments/preview`; **Confirm** stays disabled until the API says the adjustment is allowed (it caps one adjustment) and a reason is typed. The same adjustment id is kept across retries so it is applied once.

## Usage tiles

The seat and scan tiles on My Plan turn red only on the API's `seatLimitReached` / `ocrLimitReached` (entitlements response); the page never compares usage with limits itself.

The tiles read "Used 3 of 5 seats" and "Used 0 of 100 scans" (`usageOfLimit`; "Used 1,200 scans" when unlimited). While bought scan credits remain, the scan tile adds "500 bought scans left" from the entitlements `ocrTopUpRemaining` (`boughtScansLeftLabel`); an older API without the field shows nothing extra.

## Plan cards on My Plan

Plan status `planOptions` (inventory-api) gives each catalogue plan an `action`: `CURRENT` ("Renew plan"), `UPGRADE` ("Upgrade", a higher plan) or `BUY` ("Buy", a lower plan, or any plan without a paid plan). `planCardCta` (`ui/planCardCta.ts`) only maps that to the button; the page never compares prices or plan order. While the paid plan has days left the API marks other plans `actionAvailable: false` (a plan change waits for the paid plan to end, `PLAN_CHANGE_NOT_ALLOWED`): the button is disabled and its reason and "Available from <date>" show under it. The reason sits in its own row of the card (`planCardNote`; the card is a two-row CSS subgrid of the grid), so every button in a row of cards stays on one line whether or not it has a reason. The trial badge shows only when plan status says `trialAvailable`. Without `planOptions` (an older API, or the public `/plans` page) the cards keep the caller's `ctaLabel`.

## Wallet history

The Referrals page lists `GET /plans/shop/wallet` entries with their `availableDelta` and `availableAfter`. The API returns only rows that moved the available balance, so a paid order shows one "Used at checkout" row (its `ORDER_RESERVATION`) and no "+₹0.00" "Spent on a plan" row; an unpaid order that ended adds "Checkout hold released". Amounts use `formatRupees` (two decimals).

## Decisions from the API

The plan screens show what the API decides and never re-derive it: plan selection leaves out plans with `selectable: false`; add-ons offered in a plan cart come from `GET /plans/addons?planCode=X` and top-ups from `GET /plans/shop/addon-options`, keeping those with `eligible !== false`; the My Plan top-up section shows only when plan status says `canBuyAddOnsAlone`; the billing limit text is the plan's `billingLimitLabel`; quote lines show `grossAmount`.

## Add-on catalogue (admin)

The add-on form sends what the admin chose; the API derives `billingType` from the grant type (OCR credits one-time, the rest annual) and, for a feature add-on, `grantsQuantity` 1 and not stackable, and rejects contradictory combinations (`toAddOnRequest` no longer sets them).

## Plan grants (admin)

Plans & add-ons → **Shop plan & add-ons**: after looking up a shop, **Grant a plan** (`PlanGrantForm`) takes a plan (the plan list's selectable plans, `planGrantOptions`), 1–36 months and a reason (at most 200 characters). **Review grant** opens a confirm dialog that repeats the shop, plan, months and reason; **Grant plan** sends `POST /admin/shops/{shopId}/plan-grants` and shows the plan and expiry from the returned plan status. The API decides the term (the same plan extends from the current expiry) and refuses another plan while paid days remain; its message is shown in the dialog.

## Dates

Every plan-area date (My Plan "Renews"/"Expires", "Available from" on plan cards, past purchases, wallet history, add-on "Valid until") goes through `formatPlanDate` (`ui/planDate.ts`): the Indian calendar day as "21 Nov 2027", the day-month-year style the rest of the app shows. The API sends ISO instants only.
