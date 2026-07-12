# Platform packages

Infrastructure shared by the app and domains. **No domain business UI** here (except shell layout chrome).

| Package                     | npm name                         | Role                                       |
| --------------------------- | -------------------------------- | ------------------------------------------ |
| [access](./access/)         | `@inventory-platform/access`     | Shop access / capability field helpers     |
| [api-client](./api-client/) | `@inventory-platform/api-client` | Axios HTTP client + helpers                |
| [contracts](./contracts/)   | `@inventory-platform/contracts`  | Cross-cutting DTOs / guard types           |
| [query](./query/)           | `@inventory-platform/query`      | TanStack Query provider + key factory      |
| [routing](./routing/)       | `@inventory-platform/routing`    | `RouteModule`, nav, plugin types           |
| [schema](./schema/)         | `@inventory-platform/schema`     | Vertical schema field renderer             |
| [session](./session/)       | `@inventory-platform/session`    | Auth, shop, capabilities, toasts stores    |
| [shell](./shell/)           | `@inventory-platform/shell`      | Dashboard layout, nav composition UI, help |

Dependency direction: **domains → platform → ui-kit** (shell may use ui-kit). Platform must not import `core/*`.
