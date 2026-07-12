# Inventory Platform (StockKart frontend)

Nx + React monorepo for the StockKart inventory web app. Domains live under `core/*`, shared UI under `ui-kit`, platform infra under `platform/*`, and vertical extras under `plugins/*`.

## Topology

```text
inventory-platform/
├── apps/inventory/     # App shell: providers, route composer, env
├── platform/           # Infra only (no business UI)
├── ui-kit/             # Design system (primitives + chrome patterns)
├── core/               # Domain modules (api, queries, pages, routes, nav)
├── plugins/            # Vertical plugins (e.g. cafe) + registry
└── docs (repo root)    # ../docs_stockkart/FRONTEND_MONOREPO_REDESIGN.html
```

| Layer        | Package examples                             | May depend on                                          |
| ------------ | -------------------------------------------- | ------------------------------------------------------ |
| App          | `@inventory-platform/inventory`              | everything                                             |
| Plugins      | `plugin-cafe`, `plugin-registry`             | platform, ui-kit, contracts, selected core public APIs |
| Core domains | `product`, `accounting`, `user`, …           | platform, ui-kit, contracts                            |
| Platform     | `shell`, `session`, `api-client`, `query`, … | ui-kit (shell), contracts                              |
| ui-kit       | `@inventory-platform/ui-kit`                 | **nothing** in core/platform (presentation only)       |

## Quick start

```sh
pnpm install
pnpm nx dev inventory
```

Docker (frontend + API + Mongo):

```sh
cp .env-example .env
docker-compose up
```

- Frontend: http://localhost:4200
- API: http://localhost:8080

## Common commands

```sh
pnpm nx dev inventory          # Vite / React Router app
pnpm nx build inventory
pnpm nx lint <project>
pnpm nx typecheck <project>
pnpm nx storybook ui-kit
pnpm nx graph                  # dependency graph
```

## Where work lives

| Concern                             | Package               |
| ----------------------------------- | --------------------- |
| Dashboard layout, nav, toasts, help | `platform/shell`      |
| Auth session, shop, capabilities    | `platform/session`    |
| HTTP client                         | `platform/api-client` |
| TanStack Query setup                | `platform/query`      |
| Vertical schema fields              | `platform/schema`     |
| Buttons, forms, chrome CSS maps     | `ui-kit`              |
| Scan & sell, stock, returns         | `core/product`        |
| Login / onboarding / shops / CRM    | `core/user`           |
| Cafe menu / ingredient stock        | `plugins/cafe`        |

## Conventions

- Prefer ui-kit primitives (`Box`, `Stack`, `Button`, `Link`, `FormField`) over raw HTML.
- In-app actions: `Button variant="solid"`. Marketing CTAs: `variant="brand"`.
- Domain visual polish: use the matching `*Chrome` export from ui-kit (`shellChrome`, `journeyChrome`, `chartChrome`, `productChrome`, `accountingChrome`, …).
- Data: TanStack Query hooks in `core/*/queries`; avoid new Zustand stores for server state.
- Each domain owns `routes.ts` + `nav.ts`; the app/registry composes them.

## Vertical schema

Shop/product UIs render **API-driven vertical fields** (no hardcoded pharmacy-only forms). Schema sources and surfaces are documented historically in older notes; canonical runtime code lives in `platform/schema` + `platform/session` (`useVerticalSchemaStore`).

After API seed changes to `vertical_schemas`, restart/reseed the API so the UI picks up new labels.

## Docs

- [Agent context (AI)](./AGENTS.md) — boundaries, ui-kit, design principles
- [Contributing & PR process](./CONTRIBUTING.md)
- [Frontend monorepo redesign](../docs_stockkart/FRONTEND_MONOREPO_REDESIGN.html)
- [UI kit requirements](../docs_stockkart/UI_KIT_REQUIREMENTS.html)
- Per-package READMEs under `core/`, `platform/`, `ui-kit/`, `plugins/`
