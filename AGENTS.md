# StockKart Frontend — Agent Rules

## Purpose

- Rules for AI agents and new engineers changing `inventory-platform`. Reviewers cite them by section name.
- Every rule names one file that follows it. Where code is inconsistent, the dominant convention is the rule and the exceptions are listed. Do not add to an exception list.
- Before any change, read the owning package's `README.md`. Example: `core/reminders/README.md`.
- Cross-repo topics live in the handbook: `handbook/ARCHITECTURE.md`, `handbook/API_CONTRACT.md`, `handbook/REVIEW_RUBRIC.md`, `handbook/RUNBOOK.md`, `handbook/decisions/`.

## Tech stack and versions

Resolved versions from `pnpm-lock.yaml`; ranges in `package.json`.

| Item                                          | Version                  | Note                                                                                                           |
| --------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Node                                          | 20                       | `.github/workflows/ci.yml`                                                                                     |
| pnpm                                          | 9.8.0                    | CI version (`.github/workflows/ci.yml`). `package.json` also lists `pnpm ^10.24.0` as a dependency. Use 9.8.0. |
| Nx                                            | 22.1.2                   | inferred targets from `@nx/js/typescript`, `@nx/vite`, `@nx/eslint`, `@nx/react/router-plugin` (`nx.json`)     |
| React / React DOM                             | 19.2.0                   |                                                                                                                |
| React Router                                  | 7.9.6                    | framework mode, SSR on (`apps/inventory/react-router.config.ts`)                                               |
| TypeScript                                    | 5.9.3                    | `strict` (`tsconfig.base.json`)                                                                                |
| Vite / Vitest                                 | 7.2.4 / 4.0.14           |                                                                                                                |
| Testing Library React / jest-dom / fast-check | 16.3.0 / 6.6.3 / 3.23.2  |                                                                                                                |
| TanStack Query / Zustand / axios              | 5.101.2 / 5.0.8 / 1.13.2 |                                                                                                                |
| ESLint (flat) / Prettier                      | 9.39.1 / 2.8.8           | `.prettierrc`; husky pre-commit runs `lint-staged` (prettier)                                                  |
| Storybook                                     | 10.4.6                   | ui-kit only                                                                                                    |
| Recharts / lucide-react                       | 3.6.0 / 0.554.0          | Recharts in `core/analytics` only (`core/analytics/package.json`)                                              |

## Nx workspace structure and project boundaries

- There are 24 projects (`pnpm exec nx show projects`). Tags come from each package's `package.json` `nx.tags`. ui-kit declares its tag in both `ui-kit/package.json` and `ui-kit/project.json`.
- Boundaries are enforced by `@nx/enforce-module-boundaries` in root `eslint.config.mjs`:

| Source tag      | Projects                           | May import tags                |
| --------------- | ---------------------------------- | ------------------------------ |
| `type:app`      | `apps/inventory`                   | app, platform, plugin          |
| `type:plugin`   | `plugins/cafe`, `plugins/registry` | platform, core, plugin, ui-kit |
| `type:core`     | `core/*`                           | platform, core, ui-kit         |
| `type:platform` | `platform/*`                       | platform, plugin, core, ui-kit |
| `type:ui-kit`   | `ui-kit`                           | ui-kit only                    |

- `type:journey` is declared in the config. No project carries it.
- `apps/inventory` composes only through `@inventory-platform/plugin-registry/routes` (plus the `plugin-registry` barrel, `shell`, `query`, `session`, `routing`). A `no-restricted-imports` block in root `eslint.config.mjs` bans domain packages, `*/api`, `*/ui` and `*/pages/*` there. Example: `apps/inventory/app/routes.tsx`.
- Team rule, stricter than lint: `platform/*` does not import `core/*` or `plugins/*`. Example: `platform/session/src/lib/useAuthStore.ts`.
  - Exception: `platform/shell/src/lib/DashboardLayout.tsx` imports `@inventory-platform/user/shops`.
- Import another package only through its `package.json` `exports` (`.`, `/types`, `/nav`, `/routes/*`). Never import its `src/` paths. Example: `core/reminders/package.json`.
- Domain-to-domain imports use the public barrel. Example: `core/reminders/src/pages/RemindersPage.tsx` imports `InventoryAlertDetails` from `@inventory-platform/product`.
- Each package `eslint.config.mjs` spreads the root config and adds `domainUiKitHtmlBan`. Example: `core/user/eslint.config.mjs`.
  - Exceptions (no JSX): `platform/access/eslint.config.mjs`, `platform/contracts/eslint.config.mjs`.

## Repository layout

```text
apps/inventory/      route composer, providers, global reset only
core/<domain>/       one business domain each
platform/<infra>/    access, api-client, contracts, query, routing, schema, session, shell
plugins/cafe/        vertical extras
plugins/registry/    merges core + plugin routes, nav, profile tabs
ui-kit/              design system: primitives, patterns, chrome maps, tokens
.github/             CI workflows, labels, CODEOWNERS, package-tracking script
.cursor/rules/       Cursor rules (architecture, domains, new package, ui-kit)
docs/deploying.md    deploy guide
scripts/deploy/      Vercel deploy and verify scripts
```

| Package         | Owns                                                               |
| --------------- | ------------------------------------------------------------------ |
| `product`       | registration, search, scan-sell, checkout route, returns, history  |
| `user`          | auth journeys, onboarding, shops, profile, customers/vendors, team |
| `accounting`    | journal, ledger, COA, reports                                      |
| `analytics`     | sales/profit/inventory/vendor/customer analytics                   |
| `mis`           | vendor/customer money, sales, stock MIS reports                    |
| `credit`        | credit balances / charges                                          |
| `plan`          | plan status, payment, marketing plan UI                            |
| `pricing`       | pricing list + price edit                                          |
| `reminders`     | reminders + inventory alert                                        |
| `taxation`      | GSTR tabs                                                          |
| `checkout`      | **scaffold only** — real checkout still in `product`               |
| `notifications` | **scaffold only** — bell UI in `platform/shell`                    |

- Platform: access (capabilities), api-client (HTTP), contracts (shared types), query (QueryClient, key factory), routing (`RouteModule`, nav types), schema (vertical fields), session (auth, shop, toasts), shell (dashboard chrome).
- Standard domain layout: `api/ model/ queries/ pages/ ui/ routes/ routes.ts nav.ts index.ts`. Example: `core/reminders/src/routes.ts`.
  - `core/checkout` and `core/notifications` have only `queries/` (keys only) and `index.ts`.
  - `core/pricing` has no `ui/`. Its hooks in `core/pricing/src/queries/hooks.ts` have no consumers.
  - `core/product` adds `lib/`, `search/`, `cardLayout/`, `vertical/`. `core/user` adds `journey/`. `core/plan` adds `marketing/`, `payment/`.
- ui-kit layers: `layout/ forms/ feedback/ overlay/ data-display/ patterns/ theme/ tokens/`. Source: `ui-kit/README.md`.

## Component conventions

- Pages are `core/<d>/src/pages/<Name>Page.tsx` with a named `export function <Name>Page()`. Example: `core/reminders/src/pages/RemindersPage.tsx`.
  - Exceptions: `core/taxation/src/pages/Gstr1Tab.tsx`, `core/taxation/src/pages/Gstr2Tab.tsx`, `core/taxation/src/pages/Gstr3bTab.tsx` use `*Tab` names and also default-export.
- Domain widgets are `core/<d>/src/ui/<Name>.tsx` in PascalCase, re-exported from `core/<d>/src/ui/index.ts`. Example: `core/user/src/ui/index.ts`.
  - Lower-case files: `core/accounting/src/ui/tabNav.tsx`, `core/analytics/src/ui/tabNav.tsx`, `core/taxation/src/ui/tabNav.tsx`.
  - No `core/<d>/src/ui/index.ts` barrel: `core/accounting`, `core/analytics`, `core/credit`, `core/mis`. Import by relative path there. Add the barrel only when the package exports a widget.
- Components are named function declarations. Never `const X = () =>` or `React.FC`. All page and ui files follow this. Example: `core/user/src/ui/RoleBadge.tsx`.
- Props are an `interface <Name>Props` above the component, destructured in the signature. Export it only if another file needs it. Example: `core/user/src/ui/RoleBadge.tsx`.
  - Exceptions, `type <Name>Props =`: `core/accounting/src/ui/JournalEntryEditor.tsx`, `core/product/src/pages/VendorInvoicesPage.tsx`, `core/product/src/ui/HistoryFiltersBar.tsx`, `core/product/src/ui/HistoryListSummary.tsx`, `core/product/src/ui/PackagingFactorInput.tsx`, `platform/routing/src/lib/FormKeyboardNavScope.tsx`, `platform/shell/src/lib/CommandPalette.tsx`, `platform/shell/src/lib/ContextualHelpPanel.tsx`, `platform/shell/src/lib/KeyboardShortcutsModal.tsx`, `platform/shell/src/lib/YouTubeHelpModal.tsx`.
  - Exceptions, bare `type Props =`: `core/accounting/src/ui/AccountPicker.tsx`, `core/accounting/src/ui/PartyLineFields.tsx`, `core/credit/src/ui/CreditAccountList.tsx`, `core/credit/src/ui/CreditEntriesTimeline.tsx`, `core/credit/src/ui/CreditManualChargeForm.tsx`, `core/credit/src/ui/CreditPartiesSidebar.tsx`, `core/credit/src/ui/CreditPartyActions.tsx`.
- Hooks are `use<Name>.ts` next to the feature that owns them. Example: `core/product/src/search/useProductSearch.ts`. Server-state hooks go in queries (see State and data fetching).
- Types live in `src/model/`, exported as `@inventory-platform/<d>/types`. Example: `core/reminders/package.json`.
  - Inside a package, imports are mixed: about 100 files use the `/types` self-alias, about 90 use relative `../model` (user, product, pricing, accounting, reminders). Match the file you edit.
- Use ui-kit primitives, never native tags. `bannedNativeHtmlTags` in root `eslint.config.mjs` bans `div span p button input select textarea table form label a ul ol li h1–h6` in domain, shell, schema, routing and plugin code. For semantics use `Text as="h2"` or `Box as="span"`. Example: `core/user/src/pages/ProfilePage.tsx`.
- No native dropdowns anywhere, ui-kit included. Every picker is ui-kit `Select` (a button opening the `ChoiceList` panel, portalled above scroll containers and modals) or `FilterDropdown` + `ChoiceList` for filter pills. ESLint bans `<select>` and `<datalist>` in all packages, ui-kit too (`nativeDropdownBan` in root `eslint.config.mjs`). Tests open it with a click on its label and pick `getByRole('option', …)`. Example: `core/product/src/ui/rateRules/RateRulesSection.test.tsx`.
- `Button` defaults to `variant="solid"` (`ui-kit/src/forms/Button.tsx`). Use `brand` for marketing only. Example: `core/plan/src/ui/Hero.tsx`.
  - Exceptions: the auth forms in `core/user/src/journey/auth/forms/` and `core/user/src/journey/ui/JourneyHeader.tsx`.
- Toasts: `useNotify` from `@inventory-platform/session`. It is an object, not a hook: destructure it, do not call it. Example: `core/reminders/src/ui/ReminderForm.tsx`.
- A ui-kit component is `ui-kit/src/<layer>/<Name>.tsx` with its layer `*.module.css`, exported from the layer `index.ts` and `ui-kit/src/index.ts`, with a `<Name>.stories.tsx`. Example: `ui-kit/src/forms/Button.tsx`.
  - ui-kit never fetches data and never imports session or routing (`ui-kit/README.md`).

## Styling

General:

- CSS modules exist only in ui-kit. `cssModuleImportBan` in root `eslint.config.mjs` blocks `.module.css` imports elsewhere. A "local style" is therefore a new key in the chrome map that owns the surface. Never add a CSS file under `core/`. Example: `ui-kit/src/patterns/SurfaceChrome.tsx`.
- Use the owning chrome map: `shellChrome`, `journeyChrome`, `chartChrome`, `productChrome`, `registrationChrome`, `accountingChrome`, `surfaceChrome`, `searchChrome`. Other class maps exported from `ui-kit/src/patterns/index.ts`: `pageStyles`, `accordionStyles`, `vendorStyles`, `uploadLayoutStyles`, `denseDataGrid`. Do not create a new global CSS system. Example: `core/analytics/src/ui/SalesByGroupChart.tsx`.
- A class is usable only once its key is in the `as const` map. Add the CSS rule and the key in the same change. Keys equal class names. Example: `ui-kit/src/patterns/SurfaceChrome.tsx`.
- Name view-specific keys `<view><Element>`, e.g. `invoiceSettingsHeader`. Example: `ui-kit/src/patterns/SurfaceChrome.tsx`.
- Colours, spacing and radii use `var(--sk-*, <fallback>)`. In `ui-kit/src/patterns/SurfaceChrome.module.css` about 275 lines use a fallback, under 20 do not. Example: `.profileHeroTitle` in `ui-kit/src/patterns/SurfaceChrome.module.css`.
  - Exceptions: about 45 raw hex lines in the same file (e.g. the `.profileHeroIcon` colour). Do not add more.
- No inline `style={{}}`. The `cssModuleImportBan` lint message still suggests "inline styles"; the team rule overrides it. Example: `core/user/src/ui/InvoiceSeriesSection.tsx`.
  - Exceptions: `core/product/src/ui/cardLayout/CardLayoutPreview.tsx`, `core/product/src/pages/BarcodesPage.tsx`, `core/user/src/journey/onboarding/onboarding.tsx`, `platform/shell/src/lib/KeyboardShortcutsModal.tsx`.
- Wrap Recharts in `chartChrome.plot`; `min-height` alone renders blank charts. Example: `core/analytics/src/ui/SalesByGroupChart.tsx`.
- Global CSS is only the reset and token import in `apps/inventory/styles.css`. Do not add to it.

Token or class:

- Add a `--sk-*` token in `ui-kit/src/theme/tokens.css` only for a semantic value (colour, space, radius, shadow, z, font) that changes with theme, or that two or more chrome or primitive CSS files need.
- Define a new token in both the `:root, [data-theme='light']` block and the `[data-theme='dark']` block. Example: `--sk-gradient-brand`, used by `ui-kit/src/forms/forms.module.css` and `ui-kit/src/patterns/MarketingCtaBand.module.css`.
- Otherwise add a class to the owning chrome map, built from existing tokens.

Shared classes:

- Before changing any chrome class, find its consumers. For other maps, swap the map and key:

  ```sh
  grep -rlw "surfaceChrome.profileHero" core platform plugins apps ui-kit/src
  grep -nw "\.profileHero" ui-kit/src/patterns/SurfaceChrome.module.css
  ```

  - `-w` excludes longer keys such as `profileHeroMain`.
  - The second command finds the `@media`, `[data-theme]` and descendant rules for the class.

- A class with two or more consumer files is shared.
- Edit a shared class in place only when (a) it has one consumer file, or (b) the change is meant for every consumer: a token swap, a contrast or a11y fix, or a bug visible in all views. For (b) the PR lists every consumer file and has a screenshot of each consuming view (`CONTRIBUTING.md`, "Screenshots for UI").
- To change one view, add a flat modifier class and key, and apply `cn(base, modifier)` in that view only. Example: `cn(surfaceChrome.profileCard, surfaceChrome.profileCardNarrow)` in `core/user/src/ui/InvoiceSeriesSection.tsx`.
- For a structurally different element, add a new view-prefixed key instead of reusing a `profile*` key.
- Never rename or delete a key without updating every consumer in the same change.
- Do not add descendant selectors between chrome classes (`.a .b`). Dominant convention is flat classes. #222 restyled shared `profileHero*` classes through `.profileShopCard .profileHero` and sibling rules; #223 reverted it.
  - Exceptions: 13 class-to-class descendant selectors in `ui-kit/src/patterns/SurfaceChrome.module.css`, each under a parent applied by one view. Do not extend or copy them.
    - 5 `.customersTable :global(tbody) .customers*Cell` rules, used only by `core/user/src/pages/VendorsPage.tsx`.
    - 8 rules under `invoiceTemplateChipSelected`, `invoiceToggleNested`, `invoicePreviewPaperDotMatrix`, `invoicePreviewPaperThermal`, `invoiceSettingsPreviewExpanded`, applied only by `core/user/src/ui/InvoiceSettingsSection.tsx`. Their child classes are also used by `core/product/src/ui/labelLayout/FieldToggleGroups.tsx`, `core/product/src/ui/labelLayout/LayoutOptionsPanel.tsx` and `core/product/src/ui/labelLayout/LabelPreview.tsx`.
  - Allowed: table rules on tags inside one table class, e.g. `.historyTable :global(tbody) :global(tr)`.

Worked examples:

- `.profileHero` has 2 consumers: `core/user/src/pages/ProfilePage.tsx` (Shop tab) and `core/user/src/ui/InvoiceSeriesSection.tsx` (Invoice numbering tab).
  - Task "give the Shop hero a gradient banner": do not edit `.profileHero`. Add `.profileHeroBanner` and its key. Use `cn(surfaceChrome.profileHero, surfaceChrome.profileHeroBanner)` in `ProfilePage.tsx` only.
- `.profileSectionLabel` has 10 consumers in 2 packages: `core/user/src/pages/ProfilePage.tsx`, `core/user/src/ui/InvoiceSeriesSection.tsx`, `core/user/src/ui/InvoiceSettingsSection.tsx`, `core/product/src/ui/cardLayout/CardFieldPicker.tsx`, `core/product/src/ui/cardLayout/CardLayoutPreview.tsx`, `core/product/src/ui/cardLayout/ProductCardLayoutSection.tsx`, `core/product/src/ui/labelLayout/BarcodeLabelLayoutSection.tsx`, `core/product/src/ui/labelLayout/FieldToggleGroups.tsx`, `core/product/src/ui/labelLayout/LabelPreview.tsx`, `core/product/src/ui/labelLayout/LayoutOptionsPanel.tsx`.
  - Task "brand accent on the Shop tab labels": add modifier `profileSectionLabelAccent`, apply it in `ProfilePage.tsx` only.
  - Task "new fallback colour for all section labels": edit in place. Attach screenshots of Profile → Shop, Invoice numbering, Invoice layout, Barcode labels and Product cards. Tabs come from `core/user/src/ui/ProfileTabs.tsx` and `plugins/registry/src/profile-tabs.ts`.

## State and data fetching

- All HTTP goes through `apiClient` (`platform/api-client/src/lib/client.ts`). It adds the bearer token and `X-Shop-Id`, maps errors to `ApiError` / `isApiError`, and handles 401 and 402. Example: `core/reminders/src/api/reminders.api.ts`.
- Domain endpoints live in `core/<d>/src/api/endpoints.ts`, plus a `<name>Api` object in `core/<d>/src/api/<name>.api.ts` typed with `ApiResponse<T>` from `@inventory-platform/contracts`. Example: `core/reminders/src/api/reminders.api.ts`.
  - Exceptions (blob/download helpers with their own axios calls): `core/mis/src/api/download.ts`, `core/accounting/src/api/download.ts`, `core/taxation/src/api/download.ts`, `core/product/src/api/cart.api.ts`, `core/product/src/api/upload.api.ts`, `core/product/src/api/credit-note.api.ts`, `core/product/src/api/inventory.api.ts`, `core/user/src/api/shops.api.ts`.
- New reads and mutations use TanStack Query hooks in `core/<d>/src/queries/hooks.ts`, with keys from `createQueryKeyFactory` in `core/<d>/src/queries/keys.ts`. Example: `core/reminders/src/queries/hooks.ts`, consumed by `core/reminders/src/pages/RemindersPage.tsx`.
  - Exception: `core/product` splits feature hooks into `core/product/src/queries/<feature>.queries.ts`. Follow that split inside product only.
  - Current split: about 25 page and ui files use hooks, about 50 call `<name>Api` from `useEffect`. Legacy example: `core/pricing/src/pages/PricingPage.tsx`. Do not convert legacy pages unless the task asks.
- Query defaults live in `platform/query/src/lib/queryClient.ts`. Do not override them per hook without a stated reason.
- Zustand holds client and session state only, in `platform/session/src/lib/use*Store.ts`. No new stores for server data. Example: `platform/session/src/lib/useAuthStore.ts`.
  - Exception: `plugins/registry/src/useVerticalPluginStore.ts`.
- Vertical fields come from `platform/schema` and `useVerticalSchemaStore`. Never hardcode a vertical form. Example: `platform/schema/README.md`.

`VITE_*` handling:

- App code reads variables through `import.meta.env`. Example: `apps/inventory/app/root.tsx`.
  - Exception: `apps/inventory/vite.config.mts` reads `VITE_ALLOWED_HOSTS` from `process.env` (runs in Node).
- `VITE_*` values are public in the bundle (`scripts/deploy/vercel-deploy.sh`). Never put a secret in one.
- Read the API base only via `apiClient`. Exceptions: the helpers listed above.
- To add a variable, add its name to `.env-example` and to the `env` inputs of `nx.targets.build` in `apps/inventory/package.json`.

| Name                    | Purpose                           | Read in                                 | Declared in                                            |
| ----------------------- | --------------------------------- | --------------------------------------- | ------------------------------------------------------ |
| `VITE_API_URL`          | API base URL                      | `platform/api-client/src/lib/client.ts` | `.env-example`, `docker-compose.yml`, build inputs     |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client               | `apps/inventory/app/root.tsx`           | `.env-example`, build inputs                           |
| `VITE_FACEBOOK_APP_ID`  | reserved, not read by source      | —                                       | `.env-example`, build inputs                           |
| `VITE_RAZORPAY_KEY_ID`  | optional; backend returns the key | —                                       | `.env-example`, build inputs                           |
| `VITE_MOBILE_API_URL`   | mobile upload base                | `core/product/src/api/upload.api.ts`    | build inputs only                                      |
| `VITE_BUILD_SHA`        | deployed-commit meta tag          | `apps/inventory/app/root.tsx`           | build inputs; set by `scripts/deploy/vercel-deploy.sh` |
| `VITE_ALLOWED_HOSTS`    | dev-server allowed hosts          | `apps/inventory/vite.config.mts`        | not declared                                           |

Other names in `.env-example` and `docker-compose.yml`: `INVENTORY_PLATFORM_PORT` (host port), `NODE_ENV` (Node environment), `DB_URI` and `CLIENT_URL` (backend service, commented out in compose).

## Routing

- React Router 7 framework mode with SSR. `apps/inventory/app/routes.tsx` composes `publicRoutes()` and the `dashboard` layout with `composedDashboardRoutes()` from `plugins/registry`.
- Each domain `routes.ts` exports `RouteModule`s (`path`; `children` with `file` relative to `src/` and `lazy`) and a `<d>DashboardRoutes` array. Example: `core/reminders/src/routes.ts`.
  - Register a domain once, in `plugins/registry/src/composed-dashboard-routes.ts`. Public routes: `plugins/registry/src/public-routes.ts`.
- Route files are `src/routes/<kebab-case>.tsx`. Each default-exports the page and exports `meta` (all 57 in `core`, `plugins` and `platform/shell` do).
  - Dominant (31 files): `meta` defined in the route file. Example: `core/reminders/src/routes/index.tsx`.
  - Exception (26 files): `meta` re-exported from the page, e.g. `core/pricing/src/routes/pricing.tsx`.
- `nav.ts` exports a `NavContribution` whose `groupId` is in `NAV_GROUP_ORDER` (`plugins/registry/src/composed-nav.ts`). Example: `core/reminders/src/nav.ts`.
  - Gate a whole group with `requiredCapability`. Example: `core/accounting/src/nav.ts`.
- `DashboardRouteGuard` wraps all dashboard routes (`apps/inventory/app/routes/dashboard._layout.tsx`). Gate features inside a page with `useCapabilityFeatureGuard`. Example: `core/product/src/pages/VendorReturnPage.tsx`.
- Profile tabs owned by other domains register through `plugins/registry/src/profile-tabs.ts`.

## Accessibility expectations

- Label every input with `FormField label` (wires `htmlFor` and `aria-describedby`, `ui-kit/src/forms/FormField.tsx`). Mark required fields with `required`, never `*` in the label. Example: `core/user/src/ui/CustomerEditForm.tsx`.
  - Exception: `core/user/src/journey/onboarding/request-join-shop.tsx`.
- Icon-only actions use `IconButton label`, which becomes `aria-label` (`ui-kit/src/forms/IconButton.tsx`). Example: `core/product/src/ui/cardLayout/FieldInspector.tsx`.
- Decorative icons get `aria-hidden`. Example: `core/user/src/pages/ProfilePage.tsx`.
- Dialogs use ui-kit `Modal` or `Drawer`; they provide role, `aria-modal`, Escape and focus handling (`ui-kit/src/overlay/Modal.tsx`). Example: `core/reminders/src/pages/InventoryAlertPage.tsx`.
- Screen-reader-only text uses `VisuallyHidden`. Example: `core/user/src/pages/AccessControlPage.tsx`.
- Tab lists and lists need an accessible name, e.g. `aria-label="Profile sections"`. Example: `core/user/src/ui/ProfileTabs.tsx`.
- Tests query by role or label (see Testing).
- jsx-a11y lint runs only where `nx.configs['flat/react']` is spread: `apps/inventory`, `core/product`, `plugins/cafe`. Example: `core/product/eslint.config.mjs`. Check other packages by hand.
- Stories run `@storybook/addon-a11y` (`ui-kit/.storybook/main.ts`).

## Testing

- Test targets exist only in `core/product`, `core/user` (`vitest.config.ts` + `vitest.setup.ts`) and `platform/schema` (`vite.config.mts`). Example: `core/user/vitest.config.ts`.
- Put `<name>.test.ts(x)` next to the source file. Example: `core/product/src/search/searchUrl.test.ts`.
- `core/product/vitest.config.ts` runs `src/ui/**` in jsdom and everything else in node. Render tests live under `src/ui/`.
- Render-test ui components with behaviour (forms, flows, tab order). Example: `core/user/src/ui/CustomerEditForm.test.tsx`.
- Unit-test pure logic in `lib/`, `model/`, `search/`. Example: `core/product/src/search/searchUrl.test.ts`.
- Use fast-check for generated inputs. Example: `core/product/src/lib/renderBarcodeLabelsHtml.lines.test.ts`.
- Test file pattern. Example: `core/product/src/ui/search/ProductSearchFlow.test.tsx`.
  - Import `describe/it/expect/vi` from `vitest` explicitly. Exception: `core/user/src/ui/ProfileTabs.test.tsx` uses globals.
  - Mock the api module with `vi.hoisted` + `vi.mock('../api/<name>.api')`.
  - Wrap renders in `QueryClientProvider` with `retry: false`; add `createMemoryRouter` when routing is involved.
  - Query with `getByRole` / `getByLabelText`.
- To add tests to a package without them, copy from `core/user`: `core/user/vitest.config.ts`, `core/user/vitest.setup.ts`, `core/user/tsconfig.spec.json`, and the `ignores` entry in `core/user/eslint.config.mjs`.

## Commands

```sh
pnpm install --frozen-lockfile                     # NODE_ENV must not be production, or devDependencies are skipped
pnpm exec nx dev inventory                         # port set in apps/inventory/vite.config.mts
pnpm exec nx build inventory
pnpm exec nx lint <project>                        # all: nx run-many -t lint --all
pnpm exec nx typecheck <project>                   # all: nx run-many -t typecheck --all
NODE_ENV=development pnpm exec nx test <project>   # product | user | schema
pnpm run format:check
node .github/scripts/check-package-tracking.mjs
pnpm exec nx storybook ui-kit
cp .env-example .env && docker-compose up          # frontend container only; fill names in .env first
```

- Short project names work (`nx lint product`).
- The `NODE_ENV` values here (`development`, `production`) are the only env values in this file. They are shell overrides for running tests, not configuration. With `NODE_ENV=production` vitest loads the production React build and render tests fail.
- CI runs lint (`.github/workflows/eslint.yml`), format (`.github/workflows/format.yml`), test + build + typecheck (`.github/workflows/ci.yml`) and package tracking.

Status, run in the task workspace on 2026-10-17 (pnpm 10.24.0, Node 20.20.2):

| Command                                                | Result                                                                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `nx run-many -t lint --all`                            | pass: 24 projects, 0 errors, 44 warnings                                                                                   |
| `nx run-many -t typecheck --all`                       | pass: 24 projects                                                                                                          |
| `NODE_ENV=development nx run-many -t test --all`       | pass: 3 projects, 28 files, 253 tests                                                                                      |
| `nx run-many -t test --all` with `NODE_ENV=production` | fail: `TypeError: React.act is not a function`; `core/user` 20/32 and `core/product` 27/218 fail, `platform/schema` passes |
| `nx build inventory`                                   | pass                                                                                                                       |
| `node .github/scripts/check-package-tracking.mjs`      | pass                                                                                                                       |
| `pnpm run format:check`                                | pass on tracked files; fails locally after `nx typecheck` (29 files in gitignored `out-tsc/`, not in `.prettierignore`)    |

## Do and Don't

- Do read the owning package README first (Purpose).
- Do import other packages only through their `exports` (Nx workspace structure and project boundaries).
- Don't import `core/*` or `plugins/*` from `platform/*` (Nx workspace structure and project boundaries).
- Don't use native HTML tags in domain code; use ui-kit primitives (Component conventions).
- Don't use a native dropdown (`<select>`, `<datalist>`) anywhere, ui-kit included; use ui-kit `Select` (Component conventions).
- Do write components as named function declarations with `interface <Name>Props` (Component conventions).
- Don't use `variant="brand"` outside marketing (Component conventions).
- Don't import `.module.css` outside ui-kit or add inline styles (Styling).
- Do run the consumer grep before editing any chrome class (Styling).
- Don't edit a shared class to change one view; add a modifier key (Styling).
- Don't add descendant selectors between chrome classes (Styling).
- Do add new tokens to both light and dark blocks (Styling).
- Do put new server calls behind `core/<d>/src/queries/hooks.ts` (State and data fetching).
- Don't add Zustand stores for server data (State and data fetching).
- Don't put secrets in `VITE_*` variables (State and data fetching).
- Do register routes in `routes.ts` and nav in `nav.ts` of the owning package (Routing).
- Do test with `NODE_ENV=development` and query by role or label (Testing, Commands).

## How to add a new page or component end to end

Page in an existing domain. Walk-through package: `core/reminders`.

1. Identify the owning package and read its README (`core/reminders/README.md`).
2. Add the endpoint to `core/<d>/src/api/endpoints.ts` and the method to the `<name>Api` object (`core/reminders/src/api/reminders.api.ts`).
3. Add types in `core/<d>/src/model/` and export them from its `index.ts` (`core/reminders/src/model/index.ts`).
4. Add the key in `core/<d>/src/queries/keys.ts` and the hook in `core/<d>/src/queries/hooks.ts` (`core/reminders/src/queries/hooks.ts`).
5. Write `core/<d>/src/pages/<Name>Page.tsx` with primitives and chrome keys (`core/reminders/src/pages/RemindersPage.tsx`).
6. Put widgets in `core/<d>/src/ui/` and export them from its `index.ts` (`core/reminders/src/ui/index.ts`).
7. Add chrome keys in ui-kit. If you reuse a class, run the consumer grep first (Styling).
8. Add `core/<d>/src/routes/<kebab>.tsx` with a default export and `meta` (`core/reminders/src/routes/index.tsx`).
9. Add the `RouteModule` to `routes.ts` and to `<d>DashboardRoutes` (`core/reminders/src/routes.ts`).
10. Add the nav item in `nav.ts` (`core/reminders/src/nav.ts`).
11. Export public pieces from `index.ts` (`core/reminders/src/index.ts`).
12. Add tests if the package has a test target (Testing).
13. Run lint, typecheck and test for the project (Commands).
14. Open the PR with a Conventional Commits title, the template's Summary and Test plan, and screenshots (`CONTRIBUTING.md`).

ui-kit component:

1. Create `ui-kit/src/<layer>/<Name>.tsx` with a named function and `interface <Name>Props` (`ui-kit/src/forms/Button.tsx`).
2. Style it in the layer `*.module.css` with `var(--sk-*, <fallback>)` tokens (`ui-kit/src/forms/forms.module.css`).
3. Export it from the layer `index.ts` and `ui-kit/src/index.ts`.
4. Add `<Name>.stories.tsx` (`ui-kit/src/forms/Button.stories.tsx`).
5. Run `nx lint ui-kit` and `nx typecheck ui-kit`.

### New package checklist

Creating `core/<name>`, `platform/<name>`, or `plugins/<name>` requires wiring in the **same PR**:

| File                      | What to add                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `.github/labels.yml`      | `module:<name>` (plugins: `module:plugin-<dir>`)                                           |
| `.github/labeler.yml`     | path glob → that label                                                                     |
| `.github/CODEOWNERS`      | `/core\|platform\|plugins/<dir>/`                                                          |
| `<pkg>/eslint.config.mjs` | package lint entry                                                                         |
| root `eslint.config.mjs`  | ban `@inventory-platform/<pkg>` from `apps/inventory` (except scaffolds / plugin-registry) |
| root `tsconfig.json`      | project reference                                                                          |
| `AGENTS.md`               | domain row if user-facing                                                                  |

CI: `.github/workflows/package-tracking.yml` (`node .github/scripts/check-package-tracking.mjs`). Cursor rule: `stockkart-new-package.mdc`.
