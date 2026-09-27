import type {
  AddOnAdminRequest,
  AddOnGrantRequest,
  AddOnGrantType,
  AdminAddOn,
  AdminPlan,
  PlanAdminRequest,
  PlanFeature,
} from '@inventory-platform/plan/types';
import { endOfDayIst } from '../dates';

/** Mirrors PlanAdminValidator and AddOnAdminValidator so most mistakes show before the request. */
const PLAN_CODE = /^[A-Z][A-Z0-9_]{2,29}$/;
const ADD_ON_CODE = /^[A-Z][A-Z0-9_]{2,39}$/;
const BADGE = /^[A-Z_]{1,30}$/;
const MONEY = /^\d+(\.\d{1,2})?$/;
const WHOLE = /^\d+$/;
export const CATALOGUE_LIMITS = {
  planName: 60,
  bestFor: 200,
  addOnName: 60,
  description: 200,
  displayOrder: 1000,
  grantsQuantity: 1000,
  reason: 500,
} as const;

/** New shops are measured against it, so the server refuses to hide it. */
export const TRIAL_PLAN_CODE = 'STARTER';

export const GRANT_TYPE_LABEL: Record<AddOnGrantType, string> = {
  FEATURE: 'Unlocks a feature',
  SEATS: 'Extra users',
  SMS: 'SMS pack',
  OCR_CREDITS: 'OCR credits',
};

type Errors<T> = Partial<Record<keyof T, string>>;
type Result<R, T> = { ok: true; request: R } | { ok: false; errors: Errors<T> };

const text = (value: string | null | undefined) => value ?? '';
const numberText = (value: number | null | undefined) => (value != null ? String(value) : '');

function optional(input: string): string | null {
  const trimmed = input.trim();
  return trimmed ? trimmed : null;
}

function done<R, T>(errors: Errors<T>, build: () => R): Result<R, T> {
  const found = Object.fromEntries(
    Object.entries(errors).filter(([, message]) => message !== undefined),
  ) as Errors<T>;
  return Object.keys(found).length > 0
    ? { ok: false, errors: found }
    : { ok: true, request: build() };
}

/** Empty is null; otherwise a whole number of at least `min`. */
function optionalWhole(input: string, min: number, max?: number): number | null | 'invalid' {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!WHOLE.test(trimmed)) return 'invalid';
  const n = Number(trimmed);
  return n < min || (max !== undefined && n > max) ? 'invalid' : n;
}

function optionalMoney(input: string): number | null | 'invalid' {
  const trimmed = input.trim();
  if (!trimmed) return null;
  return MONEY.test(trimmed) ? Number(trimmed) : 'invalid';
}

export interface PlanFormState {
  code: string;
  planName: string;
  arcPrice: string;
  price: string;
  billingLimit: string;
  billCountLimit: string;
  smsLimit: string;
  whatsappLimit: string;
  userLimit: string;
  ocrLimit: string;
  unlimited: boolean;
  features: PlanFeature[];
  displayOrder: string;
  badge: string;
  bestFor: string;
  linkedId: string;
}

export const emptyPlanForm = (): PlanFormState => ({
  code: '',
  planName: '',
  arcPrice: '',
  price: '',
  billingLimit: '',
  billCountLimit: '',
  smsLimit: '',
  whatsappLimit: '',
  userLimit: '',
  ocrLimit: '',
  unlimited: false,
  features: [],
  displayOrder: '',
  badge: '',
  bestFor: '',
  linkedId: '',
});

export const planFormState = (plan: AdminPlan): PlanFormState => ({
  code: text(plan.code),
  planName: plan.planName,
  arcPrice: numberText(plan.arcPrice),
  price: numberText(plan.price),
  billingLimit: numberText(plan.billingLimit),
  billCountLimit: numberText(plan.billCountLimit),
  smsLimit: numberText(plan.smsLimit),
  whatsappLimit: numberText(plan.whatsappLimit),
  userLimit: numberText(plan.userLimit),
  ocrLimit: numberText(plan.ocrLimit),
  unlimited: plan.unlimited,
  features: [...(plan.features ?? [])].sort(),
  displayOrder: numberText(plan.displayOrder),
  badge: text(plan.badge),
  bestFor: text(plan.bestFor),
  linkedId: text(plan.linkedId),
});

const PLAN_COUNT_FIELDS = ['billCountLimit', 'smsLimit', 'whatsappLimit', 'ocrLimit'] as const;

/**
 * The server replaces every field on edit, so the full plan is always sent. `planId` is the plan
 * being edited (null on create): it checks the code on create and blocks a self-upsell.
 */
export function toPlanRequest(
  form: PlanFormState,
  planId: string | null,
): Result<PlanAdminRequest, PlanFormState> {
  const errors: Errors<PlanFormState> = {};
  const code = form.code.trim().toUpperCase();
  if (planId === null && !PLAN_CODE.test(code)) {
    errors.code = '3–30 characters of A–Z, 0–9 or _, starting with a letter.';
  }
  const name = form.planName.trim();
  if (!name || name.length > CATALOGUE_LIMITS.planName) {
    errors.planName = `Required, up to ${CATALOGUE_LIMITS.planName} characters.`;
  }

  const arcPrice = optionalMoney(form.arcPrice);
  if (arcPrice === null || arcPrice === 'invalid')
    errors.arcPrice = 'Enter a price, up to 2 decimals.';
  const price = optionalMoney(form.price);
  if (price === 'invalid') errors.price = 'Up to 2 decimals, or empty.';
  const billingLimit = optionalMoney(form.billingLimit);
  if (billingLimit === 'invalid') errors.billingLimit = 'Up to 2 decimals, or empty for none.';

  const counts = {} as Record<(typeof PLAN_COUNT_FIELDS)[number], number | null>;
  for (const field of PLAN_COUNT_FIELDS) {
    const value = optionalWhole(form[field], 0);
    if (value === 'invalid') errors[field] = 'A whole number, or empty for none.';
    else counts[field] = value;
  }
  const userLimit = optionalWhole(form.userLimit, 1);
  if (userLimit === 'invalid') errors.userLimit = 'At least 1, or empty for none.';
  const displayOrder = optionalWhole(form.displayOrder, 0, CATALOGUE_LIMITS.displayOrder);
  if (displayOrder === 'invalid') errors.displayOrder = `0–${CATALOGUE_LIMITS.displayOrder}.`;

  const badge = form.badge.trim().toUpperCase();
  if (badge && !BADGE.test(badge))
    errors.badge = 'Up to 30 characters of A–Z or _, e.g. MOST_POPULAR.';
  if (form.bestFor.trim().length > CATALOGUE_LIMITS.bestFor) {
    errors.bestFor = `At most ${CATALOGUE_LIMITS.bestFor} characters.`;
  }
  if (planId !== null && form.linkedId === planId)
    errors.linkedId = 'A plan cannot upsell to itself.';

  return done(errors, () => ({
    code,
    planName: name,
    arcPrice: arcPrice as number,
    price: price as number | null,
    billingLimit: billingLimit as number | null,
    ...counts,
    userLimit: userLimit as number | null,
    unlimited: form.unlimited,
    features: [...form.features].sort(),
    displayOrder: displayOrder as number | null,
    badge: badge || null,
    bestFor: optional(form.bestFor),
    linkedId: form.linkedId || null,
  }));
}

export interface AddOnFormState {
  code: string;
  name: string;
  description: string;
  price: string;
  grantType: AddOnGrantType;
  grantsFeature: PlanFeature | '';
  grantsQuantity: string;
  stackable: boolean;
  maxQuantity: string;
  displayOrder: string;
}

export const emptyAddOnForm = (): AddOnFormState => ({
  code: '',
  name: '',
  description: '',
  price: '',
  grantType: 'SEATS',
  grantsFeature: '',
  grantsQuantity: '1',
  stackable: true,
  maxQuantity: '',
  displayOrder: '',
});

export const addOnFormState = (addOn: AdminAddOn): AddOnFormState => ({
  code: addOn.code,
  name: addOn.name,
  description: text(addOn.description),
  price: numberText(addOn.price),
  grantType: addOn.grantType,
  grantsFeature: addOn.grantsFeature ?? '',
  grantsQuantity: numberText(addOn.grantsQuantity),
  stackable: addOn.stackable,
  maxQuantity: numberText(addOn.maxQuantity),
  displayOrder: numberText(addOn.displayOrder),
});

/**
 * OCR credits are one-time, everything else annual; a feature add-on grants one feature and is
 * bought once. The form derives those instead of asking.
 */
export function toAddOnRequest(
  form: AddOnFormState,
  isNew: boolean,
): Result<AddOnAdminRequest, AddOnFormState> {
  const errors: Errors<AddOnFormState> = {};
  const code = form.code.trim().toUpperCase();
  if (isNew && !ADD_ON_CODE.test(code)) {
    errors.code = '3–40 characters of A–Z, 0–9 or _, starting with a letter.';
  }
  const name = form.name.trim();
  if (!name || name.length > CATALOGUE_LIMITS.addOnName) {
    errors.name = `Required, up to ${CATALOGUE_LIMITS.addOnName} characters.`;
  }
  if (form.description.trim().length > CATALOGUE_LIMITS.description) {
    errors.description = `At most ${CATALOGUE_LIMITS.description} characters.`;
  }
  const price = optionalMoney(form.price);
  if (price === null || price === 'invalid' || price <= 0) {
    errors.price = 'Above 0, up to 2 decimals.';
  }

  const feature = form.grantType === 'FEATURE';
  let grantsQuantity: number | null = null;
  if (feature) {
    if (!form.grantsFeature) errors.grantsFeature = 'Choose the feature it unlocks.';
  } else {
    const n = optionalWhole(form.grantsQuantity, 1, CATALOGUE_LIMITS.grantsQuantity);
    if (n === null || n === 'invalid') {
      errors.grantsQuantity = `1–${CATALOGUE_LIMITS.grantsQuantity}.`;
    } else {
      grantsQuantity = n;
    }
  }
  const maxQuantity = optionalWhole(form.maxQuantity, 1);
  if (maxQuantity === 'invalid') errors.maxQuantity = 'At least 1, or empty for no limit.';
  const displayOrder = optionalWhole(form.displayOrder, 0, CATALOGUE_LIMITS.displayOrder);
  if (displayOrder === 'invalid') errors.displayOrder = `0–${CATALOGUE_LIMITS.displayOrder}.`;

  return done(errors, () => ({
    code,
    name,
    description: optional(form.description),
    price: price as number,
    billingType: form.grantType === 'OCR_CREDITS' ? 'ONE_TIME' : 'ANNUAL',
    grantType: form.grantType,
    grantsFeature: feature ? (form.grantsFeature as PlanFeature) : null,
    grantsQuantity: feature ? 1 : grantsQuantity,
    stackable: feature ? false : form.stackable,
    maxQuantity: maxQuantity as number | null,
    displayOrder: displayOrder as number | null,
  }));
}

export interface GrantFormState {
  addOnCode: string;
  quantity: string;
  /** YYYY-MM-DD; empty uses the end of the shop's current term. */
  expiresOn: string;
  reason: string;
}

export const emptyGrantForm = (): GrantFormState => ({
  addOnCode: '',
  quantity: '1',
  expiresOn: '',
  reason: '',
});

export function toGrantRequest(
  shopId: string,
  form: GrantFormState,
  addOn: Pick<AdminAddOn, 'code' | 'grantType'> | undefined,
): Result<AddOnGrantRequest, GrantFormState> {
  const errors: Errors<GrantFormState> = {};
  if (!addOn) errors.addOnCode = 'Choose an add-on.';
  const feature = addOn?.grantType === 'FEATURE';
  const quantity = feature ? 1 : optionalWhole(form.quantity, 1);
  if (quantity === null || quantity === 'invalid') errors.quantity = 'At least 1.';
  const reason = form.reason.trim();
  if (!reason) errors.reason = 'Required; kept in the audit log.';
  else if (reason.length > CATALOGUE_LIMITS.reason) {
    errors.reason = `At most ${CATALOGUE_LIMITS.reason} characters.`;
  }
  const credits = addOn?.grantType === 'OCR_CREDITS';

  return done(errors, () => ({
    shopId: shopId.trim(),
    addOnCode: addOn?.code ?? '',
    quantity: quantity as number,
    expiresAt: !credits && form.expiresOn ? endOfDayIst(form.expiresOn) : undefined,
    reason,
  }));
}

export function describeAddOnGrant(
  addOn: Pick<AdminAddOn, 'grantType' | 'grantsQuantity'>,
  featureLabel: (feature: PlanFeature) => string,
  grantsFeature: PlanFeature | null,
): string {
  switch (addOn.grantType) {
    case 'FEATURE':
      return grantsFeature ? featureLabel(grantsFeature) : 'Feature';
    case 'SEATS':
      return `${addOn.grantsQuantity ?? 0} extra user${addOn.grantsQuantity === 1 ? '' : 's'}`;
    case 'SMS':
      return `${(addOn.grantsQuantity ?? 0).toLocaleString('en-IN')} SMS`;
    case 'OCR_CREDITS':
      return `${(addOn.grantsQuantity ?? 0).toLocaleString('en-IN')} OCR credits`;
  }
}
