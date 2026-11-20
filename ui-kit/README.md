# @inventory-platform/ui-kit

StockKart design system — presentation-only React components, tokens, and **chrome** class maps.

**Rule:** ui-kit must **not** import API clients, session stores, routing, or domain packages.

## Commands

```bash
pnpm nx storybook ui-kit
pnpm nx build-storybook ui-kit
```

## Import

```tsx
import {
  Button,
  FormField,
  Stack,
  PageHeader,
  Table,
  journeyChrome,
  chartChrome,
  shellChrome,
} from '@inventory-platform/ui-kit';
```

Theme: wrap with `ThemeProvider`, or `@import '@inventory-platform/ui-kit/theme/tokens.css'`.

## Layers

| Layer       | Location                                     | Examples                                  |
| ----------- | -------------------------------------------- | ----------------------------------------- |
| Tokens      | `theme/`, `tokens/`                          | `--sk-*` CSS variables                    |
| Primitives  | `forms/`, `layout/`, `feedback/`, `overlay/` | `Button`, `Box`, `Alert`, `Drawer`        |
| Patterns    | `patterns/`                                  | `PageHeader`, `PaginationBar`, `AppShell` |
| Chrome maps | `patterns/*Chrome*`                          | CSS module class bags for domains         |

Domain widgets and pages stay in `core/*/ui` and `core/*/pages`.

## Chrome map

| Export               | Use for                                                       |
| -------------------- | ------------------------------------------------------------- |
| `shellChrome`        | Dashboard header, sidebar, notifications, help panel          |
| `journeyChrome`      | Auth + onboarding / shop registration                         |
| `chartChrome`        | Analytics filters, KPIs, chart frames (`plot` = fixed height) |
| `productChrome`      | Scan Sell, carts, cafe stock lines                            |
| `accountingChrome`   | Ledger / journal layouts                                      |
| `surfaceChrome`      | Generic dashboard surfaces, profile tiles, My Plan (`plan*`)  |
| `registrationChrome` | Product registration grids / vendor cards                     |

### Plan surfaces

- `PlanCard` `features` take plain strings or `{ label, comingSoon }`; `comingSoon` adds an amber "Coming soon" badge (story: _Patterns/Plan card → With coming soon lines_). The dashboard equivalent is `surfaceChrome.planComingSoon` on a `Badge variant="warning"`.
- `surfaceChrome.planTopUp*` is the My Plan "Add-ons & top-ups" disclosure: `planTopUpToggle` goes on a `Button variant="ghost"` with `aria-expanded` / `aria-controls`, `planTopUpBody` on the controlled panel, `planTopUpGrid` / `planTopUpCard*` for the add-on cards.

## Button language

- **In-app actions:** `variant="solid"`
- **Marketing CTAs:** `variant="brand"`
- **Headline promo CTA** (one per hero, e.g. "Start Free Trial"): `variant="promo"`, brochure amber matching the "Most popular" pill

## Migration recipes

### List page

`PageHeader` + `SearchInput` + `Table` (+ loading/empty rows) + `PaginationBar` + `EditModal`. Prefer these over raw `<table>` / search inputs when touching a file.

### Simple form

`Stack` + `FormField` (+ `required` for the red asterisk — do not also put `*` in the label string) + `Button variant="solid"`.

### Dashboard section

`PageHeader` + `Card` / domain chrome classes — avoid nested card stacks without hierarchy.

## Storybook

Public exports should have stories under `src/**/*.stories.tsx`. Prefer `--sk-*` tokens in new CSS modules.
