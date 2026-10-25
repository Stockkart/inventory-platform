import { canEditProductSearchField } from '@inventory-platform/access';
import type { ShopProductSearchAccess } from '@inventory-platform/access';
import type { UpdateInventoryRequest } from '@inventory-platform/product/types';

/**
 * The RBAC keys a payload key is checked under, matching the API's `ProductSearchUpdateFields`.
 */
function rbacKeysFor(key: string, payload: UpdateInventoryRequest): string[] {
  switch (key) {
    case 'unitConversions':
      return ['unitsPerPack'];
    case 'verticalFields':
      return Object.keys(payload.verticalFields ?? {});
    default:
      return [key];
  }
}

export interface UpdateByAccess {
  /** The payload keys the user may send. */
  allowed: UpdateInventoryRequest;
  /** RBAC keys of changed fields the user may not edit; the API would refuse the whole save. */
  refused: string[];
}

/** Splits a product Edit payload into what the user may send and what their access refuses. */
export function splitUpdateByAccess(
  payload: UpdateInventoryRequest,
  access: ShopProductSearchAccess | null | undefined,
): UpdateByAccess {
  const allowed: Record<string, unknown> = {};
  const refused: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    const denied = rbacKeysFor(key, payload).filter(
      (rbacKey) => !canEditProductSearchField(rbacKey, access),
    );
    if (denied.length === 0) {
      allowed[key] = value;
    } else {
      refused.push(...denied);
    }
  }
  return { allowed: allowed as UpdateInventoryRequest, refused };
}
