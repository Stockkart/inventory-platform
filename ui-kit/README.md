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

| Export               | Use for                                                                                                                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shellChrome`        | Dashboard header, sidebar, notifications, help panel                                                                                                                                                                                                        |
| `journeyChrome`      | Auth + onboarding / shop registration                                                                                                                                                                                                                       |
| `chartChrome`        | Analytics filters, KPIs, chart frames (`plot` = fixed height)                                                                                                                                                                                               |
| `productChrome`      | Scan Sell, carts, cafe stock lines                                                                                                                                                                                                                          |
| `accountingChrome`   | Ledger / journal layouts                                                                                                                                                                                                                                    |
| `surfaceChrome`      | Generic dashboard surfaces, profile tiles, profile settings tabs (`invoiceSettings*`, `cardBuilder*`, `rateRules*`)                                                                                                                                         |
| `searchChrome`       | Filter strip under a search bar: `FilterStrip` + `FilterDropdown` pills, `FacetCheckboxList` inside; `CollapsibleGroup` for vertical panels. `FilterDropdown block` + `ChoiceList` is the custom single-choice dropdown for a form row (no native `select`) |
| `registrationChrome` | Product registration grids / vendor cards                                                                                                                                                                                                                   |

## Dropdowns

No native `<select>` or `<datalist>`, here or in any package (ESLint bans them). `Select` is the StockKart dropdown: a field-styled button that opens `ChoiceList` in an `AnchoredPortal` panel (out of scroll containers, over modals, flips up near the bottom). It keeps the native props (`value`, `onChange` with `event.target.value`, `options` or `<option>` children, `id`, `name`, `required`). Filter pills use `FilterDropdown` + `ChoiceList`.

## Button language

- **In-app actions:** `variant="solid"`
- **Marketing CTAs:** `variant="brand"`

## Migration recipes

### List page

`PageHeader` + `SearchInput` + `Table` (+ loading/empty rows) + `PaginationBar` + `EditModal`. Prefer these over raw `<table>` / search inputs when touching a file.

### Simple form

`Stack` + `FormField` (+ `required` for the red asterisk — do not also put `*` in the label string) + `Button variant="solid"`.

### Dashboard section

`PageHeader` + `Card` / domain chrome classes — avoid nested card stacks without hierarchy.

## Storybook

Public exports should have stories under `src/**/*.stories.tsx`. Prefer `--sk-*` tokens in new CSS modules.
