# @inventory-platform/store

Zustand stores for app state.

## Vertical schema cache (Phase 2+)

`useVerticalSchemaStore` (`src/lib/useVerticalSchemaStore.ts`) caches shop schemas by **shop id + mode** (`shop:<shopId>:regular`, etc.). The cache is cleared on logout and active-shop switch.

Used by: product registration, product search (searchable field detection), onboarding, scan-sell.

```ts
const fetchShopSchema = useVerticalSchemaStore((s) => s.fetchShopSchema);
const schema = await fetchShopSchema('regular');
```

## Building

Run `nx build store` to build the library.
