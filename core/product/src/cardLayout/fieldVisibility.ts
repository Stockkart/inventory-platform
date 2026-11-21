import {
  canViewProductSearchUiField,
  type ShopProductSearchAccess,
} from '@inventory-platform/access';
import type { ResolvedCardField } from '../model/cardLayout.types';

/**
 * A predicate the renderer applies after the server's resolution and before blank handling
 * (configurable-product-card Req 7.8). Policies compose; the shipped ones cover RBAC and the
 * Scan & Sell "hide purchase details" preference.
 */
export type FieldVisibilityPolicy = (field: ResolvedCardField) => boolean;

export const allowAll: FieldVisibilityPolicy = () => true;

/** Hides every field when the member cannot view product search; per-field lists plug in via access. */
export function shopAccessPolicy(
  access: ShopProductSearchAccess | null | undefined,
): FieldVisibilityPolicy {
  return (field) => canViewProductSearchUiField(field.fieldKey, access);
}

/** Hides the shop's own figures (cost, purchase discount, purchase scheme). */
export function hideSensitivePolicy(): FieldVisibilityPolicy {
  return (field) => field.sensitivity !== 'SHOP_INTERNAL';
}

/** A field is visible only when every policy agrees. */
export function composePolicies(...policies: FieldVisibilityPolicy[]): FieldVisibilityPolicy {
  if (policies.length === 0) return allowAll;
  if (policies.length === 1) return policies[0];
  return (field) => policies.every((p) => p(field));
}
