# @inventory-platform/query

**Status:** Active

TanStack Query setup for the monorepo.

## Owns

- `QueryProvider` / default client options
- `createQueryKeyFactory` helper for domain key namespaces

## Does not own

- Domain hooks (`core/*/queries`)
- Server cache invalidation policy beyond defaults (domains define that)

## Usage

Wrap the app once (inventory `root`). Domains export hooks that call `useQuery` / `useMutation` with keys from their `queries/keys.ts`.
