# @inventory-platform/access

**Status:** Active

Helpers for shop access control and capability-driven UI (e.g. which product search fields / actions are allowed).

## Owns

- Shop access / capability utilities consumed by shell and domains
- Product search field visibility helpers

## Does not own

- Access-control **page** UI (`core/user` route)
- Session capability store (`platform/session`)

## Related

- `@inventory-platform/session` — runtime capability state
- `@inventory-platform/user` — access-control screen
