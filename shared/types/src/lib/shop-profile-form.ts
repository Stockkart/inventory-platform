import type { BusinessProfile, FieldDefinition } from './business-profile.js';

/** Shop columns on register that may appear outside `entities.shop` in older flows. */
export const SHOP_REGISTER_EXTRA_FIELD_KEYS = ['panNo', 'sgst', 'cgst'] as const;

export type ShopRegisterFieldKey =
  | 'dlNo'
  | 'gstinNo'
  | 'fssai'
  | 'panNo'
  | 'sgst'
  | 'cgst';

export type ShopRegisterFormValues = Record<
  ShopRegisterFieldKey,
  string | undefined
>;

export function isShopFieldVisible(field: FieldDefinition): boolean {
  return field.visible !== false;
}

export function isShopFieldRequired(field: FieldDefinition): boolean {
  return field.required === true;
}

export function getShopEntityFields(
  profile: BusinessProfile | null | undefined
): FieldDefinition[] {
  return profile?.entities?.shop?.fields ?? [];
}

export function getVisibleShopEntityFields(
  profile: BusinessProfile | null | undefined
): FieldDefinition[] {
  return getShopEntityFields(profile).filter(isShopFieldVisible);
}

export function getShopRegisterFieldValue(
  form: ShopRegisterFormValues,
  key: string
): string {
  const value = form[key as ShopRegisterFieldKey];
  return typeof value === 'string' ? value.trim() : '';
}

/** Mirrors backend `ShopProfileValidator` for onboarding / register forms. */
export function validateShopEntityFields(
  profile: BusinessProfile | null | undefined,
  form: ShopRegisterFormValues
): string | null {
  for (const field of getVisibleShopEntityFields(profile)) {
    if (!isShopFieldRequired(field)) {
      continue;
    }
    if (!getShopRegisterFieldValue(form, field.key)) {
      const label = field.label?.trim() || field.key;
      return `${label} is required`;
    }
  }
  return null;
}

export function shopDetailsStepHint(
  profile: BusinessProfile | null | undefined
): string {
  const required = getVisibleShopEntityFields(profile).filter(isShopFieldRequired);
  if (required.length === 0) {
    return 'These fields are optional. You can skip this step or fill them later.';
  }
  const labels = required.map((f) => f.label?.trim() || f.key);
  const list =
    labels.length <= 2
      ? labels.join(' and ')
      : `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
  return `${list} ${required.length === 1 ? 'is' : 'are'} required. Other fields are optional.`;
}
