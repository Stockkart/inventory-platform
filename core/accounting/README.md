# @inventory-platform/accounting

Domain module scaffold for Phase 2a (first real extraction).

## Phase 2a checklist

1. Move `features/dashboard/src/lib/accounting/*` → `src/ui/` and `src/pages/`
2. Move accounting routes → `src/routes.ts`
3. Move `shared/api/src/lib/accounting.ts` → `src/api/accounting.api.ts`
4. Add TanStack Query hooks in `src/queries/`
5. Export public API from `src/index.ts` (`AccountPicker`, hooks, types)
6. Register routes in `apps/inventory/app/routes.tsx`
7. Delete old dashboard accounting files

See `docs_stockkart/FRONTEND_MONOREPO_REDESIGN.html` for the full plan.
