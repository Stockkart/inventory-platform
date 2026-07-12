# StockKart Frontend — Agent Context

Use this file when starting any feature in `inventory-platform`. Prefer package READMEs for deep detail; this file is the **boundary + design contract**.

## Monorepo map

```text
apps/inventory/     → route composer, providers only
platform/           → infra (shell, session, api-client, query, schema, routing, …)
ui-kit/             → design system only (no API / session / domain imports)
core/<domain>/      → one business domain each
plugins/<vertical>/ → vertical extras (e.g. cafe) loaded by registry
```

| Layer            | May import                                             | Must not import                                              |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| `ui-kit`         | nothing from core/platform                             | APIs, session, routers, domain types                         |
| `platform/*`     | ui-kit, contracts                                      | `core/*`                                                     |
| `core/*`         | platform, ui-kit, contracts                            | other domains’ **internals** (public barrels only if needed) |
| `plugins/*`      | platform, ui-kit, contracts, selected core public APIs | unrelated domain private files                               |
| `apps/inventory` | everything (composition only)                          |

## Domains (`core/`)

| Package         | Owns                                                               |
| --------------- | ------------------------------------------------------------------ |
| `product`       | registration, search, scan-sell, checkout route, returns, history  |
| `user`          | auth journeys, onboarding, shops, profile, customers/vendors, team |
| `accounting`    | journal, ledger, COA, reports                                      |
| `analytics`     | sales/profit/inventory/vendor/customer analytics                   |
| `credit`        | credit balances / charges                                          |
| `plan`          | plan status, payment, marketing plan UI                            |
| `pricing`       | pricing list + price edit                                          |
| `reminders`     | reminders + inventory alert                                        |
| `taxation`      | GSTR tabs                                                          |
| `checkout`      | **scaffold only** — real checkout still in `product`               |
| `notifications` | **scaffold only** — bell UI in `platform/shell`                    |

Standard layout: `api/` · `queries/` · `pages/` · `ui/` · `routes.ts` · `nav.ts` · `index.ts`.

## Platform highlights

- **shell** — dashboard layout, nav chrome, notifications panel, contextual help
- **session** — auth, shop, capabilities, vertical schema store, toasts
- **api-client** — HTTP only; domain endpoints live in `core/*/api`
- **query** — QueryProvider + key factory; domain hooks in `core/*/queries`
- **schema** — `VerticalSchemaFieldInput` (API-driven fields, no hardcoded pharmacy forms)
- **plugin-registry** — merges core + vertical nav/routes

## ui-kit principles

1. **Primitives first** — `Box`, `Stack`, `Inline`, `Text`, `Button`, `FormField`, `Link`, `Input`, `Select`, `Alert`, `Drawer`, `Modal`. Do not use raw `<div>` / `<a>` / `<button>` when a primitive exists (lint enforces this).
2. **Chrome maps** for domain polish — do not invent new global CSS systems:
   - `shellChrome` — header, sidebar, notifications, help
   - `journeyChrome` — auth + shop onboarding
   - `chartChrome` — analytics filters/KPIs/charts (`plot` = fixed height for Recharts)
   - `productChrome` / `registrationChrome` — Scan Sell, registration
   - `accountingChrome` — ledger/journal
   - `surfaceChrome` — generic dashboard surfaces / profile
3. **Buttons**
   - In-app actions → `variant="solid"`
   - Marketing CTAs only → `variant="brand"`
4. **Required fields** — `FormField required` adds the red `*`. Never also put `*` in the label string.
5. **Tokens** — prefer `--sk-*` CSS variables; avoid one-off hex when a token exists.
6. **ui-kit never fetches data** — presentation only.

## Design / UX principles (product UI)

- Match existing chrome; do not introduce a new visual language (no purple-gradient AI defaults, no cream+serif cluster look).
- Prefer soft borders + light elevation over nested “card in card in card”.
- One job per section: one headline, short support, primary action.
- Auth/onboarding: step titles must match the active step (no hardcoded wrong copy).
- Analytics charts: always wrap Recharts in `chartChrome.plot` (or fixed height) — `min-height` alone yields blank charts.
- Keep changes scoped to the owning package; don’t “drive-by” refactor unrelated domains.

## Data fetching

- Prefer TanStack Query hooks in `core/*/queries`.
- Don’t add new Zustand stores for server state.
- Session/auth/shop stay in `platform/session`.

## PR / quality expectations

- Conventional Commits title: `feat(product): …`, `fix(shell): …`
- Stay inside package ownership (see READMEs).
- UI PRs: screenshots; touch only the chrome/package that owns the surface.
- See `CONTRIBUTING.md` and `.github/PULL_REQUEST_TEMPLATE.md`.

## Before coding a feature

1. Identify the **owning package** (`core/X`, `platform/Y`, `plugins/Z`, or `ui-kit`).
2. Read that package’s `README.md`.
3. Reuse existing `*Chrome` / patterns; extend ui-kit only if the pattern is reusable across domains.
4. Put routes in `routes.ts` and nav in `nav.ts` of that package — do not grow a god dashboard package.
5. If ownership is unclear (`checkout` / `notifications` scaffolds), ask or follow the README “Next” guidance.

## Docs

- Package READMEs under `core/`, `platform/`, `ui-kit/`, `plugins/`
- `CONTRIBUTING.md`
