# @inventory-platform/api-client

**Status:** Active

Shared HTTP layer for all domains (Axios instance, typed helpers, error shape).

## Owns

- Configured API client (base URL, auth headers, interceptors)
- Shared request helpers / `ApiError` patterns

## Does not own

- Domain endpoint maps (`core/*/api`)
- Auth token persistence (session)

## Usage

Domain APIs import the client and call paths relative to the inventory API. Do not revive a mega `shared/api` barrel.

## Related

- `@inventory-platform/session` — attaches credentials
- Each `core/*/api/*`
