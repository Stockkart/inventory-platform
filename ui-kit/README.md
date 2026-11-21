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

| Layer       | Location                                     | Examples                                                                                                                                                                       |
| ----------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tokens      | `theme/`, `tokens/`                          | `--sk-*` CSS variables                                                                                                                                                         |
| Primitives  | `forms/`, `layout/`, `feedback/`, `overlay/` | `Button`, `Box`, `Alert`, `Drawer`, `FloatingPanel`, `ReasonDialog`                                                                                                            |
| Patterns    | `patterns/`                                  | `PageHeader`, `PaginationBar`, `AppShell`, `CalculatorPanel`, `ComparisonTable` (plan feature grid, pinned label column), `SaleBanner` (scrolling sale strip, no close button) |
| Chrome maps | `patterns/*Chrome*`                          | CSS module class bags for domains                                                                                                                                              |

Dense grids with shop-set column layouts use `GridColGroup` + `denseDataGrid.tableFixed` (fixed
widths, sideways scroll), `ResizableHeaderCell` (drag or arrow-key resize, optional drag-to-reorder)
and `ColumnManager` (drawer to reorder and show/hide columns; locked columns cannot be hidden), whose
rows are also exported as `ColumnList` (with optional px width fields) for settings pages.
They are presentation only: the caller owns widths, order and saving.

Domain widgets and pages stay in `core/*/ui` and `core/*/pages`.

`useDebouncedValue(value, ms)` (`utils/`) follows a value once it has stopped changing, e.g. to debounce a live preview request; like `useMatchMedia` it holds no data.

**Promo palette.** `--sk-color-promo` / `-promo-hover` / `-promo-text` are the brochure amber of the one headline promo (`Button variant="promo"`, the "Most popular" pills); `--sk-color-on-dark` is text on surfaces that stay dark in both themes (sale strip, My Plan hero). Same values in light and dark.

**Categorical palette.** `--sk-color-category-1` … `-6` (light and dark values in `theme/tokens.css`) tell sibling groups apart, e.g. cafe menu sections. They are not status colours; use `--sk-color-success` / `-warning` / `-danger` / `-info` for state.

## Chrome map

| Export               | Use for                                                                                                                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shellChrome`        | Dashboard header, sidebar, notifications, help panel                                                                                                                                                                                                        |
| `journeyChrome`      | Auth + onboarding / shop registration                                                                                                                                                                                                                       |
| `chartChrome`        | Analytics filters, KPIs, chart frames (`plot` = fixed height)                                                                                                                                                                                               |
| `productChrome`      | Scan Sell, carts, cafe stock lines                                                                                                                                                                                                                          |
| `accountingChrome`   | Ledger / journal layouts                                                                                                                                                                                                                                    |
| `surfaceChrome`      | Generic dashboard surfaces, profile tiles, profile settings tabs (`invoiceSettings*`, `cardBuilder*`, `rateRules*`), My Plan (`plan*`)                                                                                                                      |
| `searchChrome`       | Filter strip under a search bar: `FilterStrip` + `FilterDropdown` pills, `FacetCheckboxList` inside; `CollapsibleGroup` for vertical panels. `FilterDropdown block` + `ChoiceList` is the custom single-choice dropdown for a form row (no native `select`) |
| `registrationChrome` | Product registration grids / vendor cards                                                                                                                                                                                                                   |

### Plan surfaces

- `PlanCard` `features` take plain strings or `{ label, comingSoon }`; `comingSoon` adds an amber "Coming soon" badge (story: _Patterns/Plan card → With coming soon lines_). The dashboard equivalent is `surfaceChrome.planComingSoon` on a `Badge variant="warning"`.
- `surfaceChrome.planTopUp*` is the My Plan "Add-ons & top-ups" disclosure: `planTopUpToggle` goes on a `Button variant="ghost"` with `aria-expanded` / `aria-controls`, `planTopUpBody` on the controlled panel, `planTopUpGrid` / `planTopUpCard*` for the add-on cards.

## Dropdowns

No native `<select>` or `<datalist>`, here or in any package (ESLint bans them). `Select` is the StockKart dropdown: a field-styled button that opens `ChoiceList` in an `AnchoredPortal` panel (out of scroll containers, over modals, flips up near the bottom). It keeps the native props (`value`, `onChange` with `event.target.value`, `options` or `<option>` children, `id`, `name`, `required`). Filter pills use `FilterDropdown` + `ChoiceList`.

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

## Overlays

| Export          | Use for                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| `Modal`         | Exclusive dialogs — dims the page, closes on backdrop click and Escape                                     |
| `Drawer`        | Side sheets; locks body scroll                                                                             |
| `Popover`       | Anchored transient surfaces                                                                                |
| `FloatingPanel` | Persistent, **non-modal** surfaces the page keeps working underneath — draggable, portalled, no focus trap |

Reach for `FloatingPanel` only when the user needs the page while the surface is open (the calculator is the case it was built for). Anything exclusive is a `Modal`. Its `--sk-z-floating` sits below `--sk-z-modal`, so a real dialog covers it.

`FloatingPanel` takes focus when it opens; pass `autoFocus={false}` when restoring a panel that was left open, so a page load does not pull focus away from the page. The title bar drags it; the grip is a separate focusable handle that moves it with the arrow keys.

`CalculatorPanel` is a `FloatingPanel` with a keypad, readout and tape. It is presentation only: the host passes the formatted `display`, `pending`, `memory` and `tape`, and receives each press as a `CalculatorKey` through `onKey`. The arithmetic and persistence live in `platform/shell` (`calculatorEngine.ts`, `DashboardCalculator.tsx`).

## Storybook

Public exports should have stories under `src/**/*.stories.tsx`. Prefer `--sk-*` tokens in new CSS modules.
