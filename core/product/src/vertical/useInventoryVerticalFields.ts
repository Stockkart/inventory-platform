import { useEffect, useMemo } from 'react';
import type { VerticalSchemaFieldDef } from '@inventory-platform/schema/types';
import {
  getDynamicInventoryFields,
  isRegistrationSchemaLoaded,
  schemaModeForBilling,
} from '@inventory-platform/schema';
import {
  shopSchemaCacheKey,
  useAuthStore,
  useVerticalSchemaStore,
} from '@inventory-platform/session';
import type { BillingMode } from '../model/types';

export interface InventoryVerticalFields {
  /** The vertical-owned inventory fields a product carries, in schema order. */
  fields: VerticalSchemaFieldDef[];
  verticalId: string | null;
  /** False until the shop schema for this billing mode has arrived. */
  loaded: boolean;
}

const NO_FIELDS: VerticalSchemaFieldDef[] = [];

/**
 * The vertical fields of the active shop's inventory, for the billing mode a product was
 * registered under. Loads the shop schema on demand and shares the cache with registration, so
 * the details modal and the registration grid always describe the same set of fields.
 */
export function useInventoryVerticalFields(
  billingMode: BillingMode | null | undefined,
): InventoryVerticalFields {
  const shopId = useAuthStore((s) => s.user?.shopId ?? null);
  const mode = schemaModeForBilling(billingMode ?? 'REGULAR');
  const fetchShopSchema = useVerticalSchemaStore((s) => s.fetchShopSchema);
  const shopSchema = useVerticalSchemaStore((s) =>
    shopId ? s.shopSchemaByKey[shopSchemaCacheKey(shopId, mode)] ?? null : null,
  );

  useEffect(() => {
    if (!shopId) return;
    void fetchShopSchema(mode);
  }, [shopId, mode, fetchShopSchema]);

  return useMemo(() => {
    const loaded = isRegistrationSchemaLoaded(shopSchema, billingMode ?? 'REGULAR', { shopId });
    return {
      fields:
        loaded && shopSchema
          ? getDynamicInventoryFields(shopSchema.entities, 'registration')
          : NO_FIELDS,
      verticalId: shopSchema?.verticalId ?? null,
      loaded,
    };
  }, [shopSchema, billingMode, shopId]);
}
