# @inventory-platform/contracts

**Status:** Active

Lightweight cross-package types that must not live inside a single domain (plans, pricing DTOs, notifications, cafe menu types, plan guards).

## Owns

- Shared TypeScript contracts only (no React, no fetch)

## Does not own

- Domain-only models (keep those in `core/*/model`)
- Runtime validation libraries

## Rule

Prefer moving types **into the owning domain** when only one package imports them. Use contracts for genuine cross-boundary shapes.
