# @inventory-platform/api-client

**Status:** Active

Shared HTTP layer for all domains (Axios instance, typed helpers, error shape).

## Owns

- Configured API client (base URL, auth headers, interceptors)
- Shared request helpers / `ApiError` patterns
- Per-call `ApiRequestOptions` (`headers`, `params`) and document-bodied `getBlob` / `postBlob`

## Everything goes through the interceptors

A call issued through raw `axios` skips this instance entirely — no 401 bounce to login, no
402 plan-expired, and an `AxiosError` where the rest of the app expects an `ApiError`. Two
things used to force callers out: a write needing a one-off header (an `Idempotency-Key`), and
a response that is a PDF rather than JSON. Both are covered here now, so there is no remaining
reason for a domain API to construct its own axios call.

## Does not own

- Domain endpoint maps (`core/*/api`)
- Auth token persistence (session)

## Usage

Domain APIs import the client and call paths relative to the inventory API. Do not revive a mega `shared/api` barrel.

## Related

- `@inventory-platform/session` — attaches credentials
- Each `core/*/api/*`
