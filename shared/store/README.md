# @inventory-platform/store

Zustand stores for app state.

## Vertical schema cache

`useVerticalSchemaStore` (`src/lib/useVerticalSchemaStore.ts`) caches shop schemas by **shop id + mode** (`shop:<shopId>:regular`, etc.). The cache is cleared on logout and active-shop switch. Use in registration, onboarding, and any surface that needs `GET /shops/me/schema` or public vertical preview.

```ts
const fetchShopSchema = useVerticalSchemaStore((s) => s.fetchShopSchema);
const schema = await fetchShopSchema('regular');
```

## Building

Run `nx build store` to build the library.
