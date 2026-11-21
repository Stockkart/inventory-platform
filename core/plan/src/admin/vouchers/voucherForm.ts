import type {
  AdminVoucher,
  VoucherGenerateRequest,
  VoucherListFilters,
  VoucherTarget,
  VoucherType,
  VoucherUpdateRequest,
} from '@inventory-platform/plan/types';
import { endOfDayIst, istDay, startOfDayIst } from '../dates';
import { formatRupees } from '../../ui/planPricing';

/** Mirrors VoucherAdminValidator so most mistakes show before the request. */
export const VOUCHER_MAX_BATCH = 500;
/** Rows per page of the admin voucher list (the API allows 1–500, default 100). */
export const VOUCHER_PAGE_SIZE = 100;
const CODE = /^[A-Z0-9][A-Z0-9-]{3,29}$/;
const PREFIX = /^[A-Z0-9]{1,8}$/;
const MAX_NOTE = 500;

export const VOUCHER_TYPE_LABEL: Record<VoucherType, string> = {
  FREE_ADDON: 'Free add-on',
  PERCENT_OFF: 'Percent off',
  FLAT_OFF: 'Flat ₹ off',
};

export const TARGET_OPTIONS: { value: VoucherTarget; label: string }[] = [
  { value: 'ADD_ON', label: 'Add-on' },
  { value: 'PLAN', label: 'Plan' },
];

/** A plan voucher can only discount: a free add-on makes no sense on a plan. */
export const typeOptionsFor = (target: VoucherTarget): { value: VoucherType; label: string }[] =>
  (Object.keys(VOUCHER_TYPE_LABEL) as VoucherType[])
    .filter((type) => target === 'ADD_ON' || type !== 'FREE_ADDON')
    .map((type) => ({ value: type, label: VOUCHER_TYPE_LABEL[type] }));

export interface VoucherFormState {
  target: VoucherTarget;
  mode: 'single' | 'batch';
  code: string;
  count: string;
  prefix: string;
  addOnCode: string;
  planCode: string;
  type: VoucherType;
  value: string;
  quantity: string;
  maxRedemptions: string;
  singleUsePerShop: boolean;
  issuedToShopId: string;
  validFrom: string;
  validTo: string;
  note: string;
}

export const emptyVoucherForm = (addOnCode = '', planCode = ''): VoucherFormState => ({
  target: planCode ? 'PLAN' : 'ADD_ON',
  mode: 'single',
  code: '',
  count: '10',
  prefix: '',
  addOnCode,
  planCode,
  type: planCode ? 'PERCENT_OFF' : 'FREE_ADDON',
  value: '',
  quantity: '1',
  maxRedemptions: '1',
  singleUsePerShop: true,
  issuedToShopId: '',
  validFrom: '',
  validTo: '',
  note: '',
});

/** Switching target clears the other target's code and any type the new target cannot use. */
export function withTarget(form: VoucherFormState, target: VoucherTarget): VoucherFormState {
  if (form.target === target) return form;
  return {
    ...form,
    target,
    addOnCode: target === 'ADD_ON' ? form.addOnCode : '',
    planCode: target === 'PLAN' ? form.planCode : '',
    type: target === 'PLAN' ? 'PERCENT_OFF' : 'FREE_ADDON',
  };
}

/** Rupees or percent with at most two decimals, as the API stores them. */
const MONEY = /^\d+(\.\d{1,2})?$/;

function wholeNumber(input: string): number | null {
  return /^\d+$/.test(input.trim()) ? Number(input.trim()) : null;
}

function optional(input: string): string | undefined {
  const trimmed = input.trim();
  return trimmed ? trimmed : undefined;
}

export type VoucherValueResult = { ok: true; value: number } | { ok: false; error: string };

/**
 * The discount a ₹ or percent voucher takes: a plain number with up to two decimals, above 0, and
 * at most 100 for a percent. The API validates it again and has the final say.
 */
export function parseVoucherValue(type: VoucherType, input: string): VoucherValueResult {
  const trimmed = input.trim();
  if (!MONEY.test(trimmed)) {
    return {
      ok: false,
      error: trimmed ? 'Enter a number like 1500 or 99.50.' : 'Enter a value above 0.',
    };
  }
  const parsed = Number(trimmed);
  if (parsed <= 0) {
    return { ok: false, error: 'Enter a value above 0.' };
  }
  if (type === 'PERCENT_OFF' && parsed > 100) return { ok: false, error: 'At most 100%.' };
  return { ok: true, value: parsed };
}

/**
 * The server applies only one list filter (plan, then add-on, then target), so an add-on is sent
 * only when the target leaves room for it.
 */
export function voucherListFilters(
  addOnCode: string,
  target: VoucherTarget | '',
): VoucherListFilters {
  return {
    target: target || undefined,
    addOnCode: target !== 'PLAN' && addOnCode ? addOnCode : undefined,
  };
}

export type VoucherFormResult =
  | { ok: true; request: VoucherGenerateRequest }
  | { ok: false; errors: Partial<Record<keyof VoucherFormState, string>> };

export function toGenerateRequest(form: VoucherFormState): VoucherFormResult {
  const errors: Partial<Record<keyof VoucherFormState, string>> = {};
  const code = form.code.trim().toUpperCase();
  const prefix = form.prefix.trim().toUpperCase();
  let count: number | undefined;

  if (form.mode === 'single') {
    if (code && !CODE.test(code)) errors.code = '4–30 characters of A–Z, 0–9 or -.';
  } else {
    const n = wholeNumber(form.count);
    if (n === null || n < 1 || n > VOUCHER_MAX_BATCH) errors.count = `1–${VOUCHER_MAX_BATCH}.`;
    else count = n;
    if (prefix && !PREFIX.test(prefix)) errors.prefix = 'Up to 8 characters of A–Z or 0–9.';
  }

  const isPlan = form.target === 'PLAN';
  if (isPlan) {
    if (!form.planCode) errors.planCode = 'Choose a plan.';
    if (form.type === 'FREE_ADDON') errors.type = 'A plan voucher must take a percent or ₹ off.';
  } else if (!form.addOnCode) {
    errors.addOnCode = 'Choose an add-on.';
  }

  let value: number | undefined;
  if (form.type !== 'FREE_ADDON') {
    const parsed = parseVoucherValue(form.type, form.value);
    if (parsed.ok) value = parsed.value;
    else errors.value = parsed.error;
  }

  const quantity = isPlan ? undefined : wholeNumber(form.quantity);
  if (!isPlan && (quantity === null || (quantity ?? 0) < 1)) errors.quantity = 'At least 1.';

  let maxRedemptions: number | undefined;
  if (form.maxRedemptions.trim()) {
    const n = wholeNumber(form.maxRedemptions);
    if (n === null || n < 1) errors.maxRedemptions = 'At least 1, or leave empty for no cap.';
    else maxRedemptions = n;
  }

  if (form.validFrom && form.validTo && form.validTo < form.validFrom) {
    errors.validTo = 'Must be on or after the start date.';
  }
  if (form.note.length > MAX_NOTE) errors.note = `At most ${MAX_NOTE} characters.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    request: {
      ...(form.mode === 'single'
        ? { code: code || undefined }
        : { count, prefix: prefix || undefined }),
      target: form.target,
      ...(isPlan
        ? { planCode: form.planCode, type: form.type, value }
        : { addOnCode: form.addOnCode, type: form.type, value, quantity: quantity ?? 1 }),
      maxRedemptions,
      singleUsePerShop: form.singleUsePerShop,
      issuedToShopId: optional(form.issuedToShopId),
      validFrom: form.validFrom ? startOfDayIst(form.validFrom) : undefined,
      validTo: form.validTo ? endOfDayIst(form.validTo) : undefined,
      note: optional(form.note),
    },
  };
}

export interface VoucherEditState {
  validTo: string;
  maxRedemptions: string;
  note: string;
}

export const voucherEditState = (voucher: AdminVoucher): VoucherEditState => ({
  validTo: istDay(voucher.validTo),
  maxRedemptions: voucher.maxRedemptions != null ? String(voucher.maxRedemptions) : '',
  note: voucher.note ?? '',
});

/**
 * The server replaces all three fields, so every one is sent: empty means no end date, no cap
 * or no note. The cap cannot go below the slots already taken.
 */
export function toUpdateRequest(
  voucher: AdminVoucher,
  edit: VoucherEditState,
): { ok: true; request: VoucherUpdateRequest } | { ok: false; error: string } {
  const validTo = edit.validTo ? endOfDayIst(edit.validTo) : null;
  if (validTo && voucher.validFrom && Date.parse(validTo) <= Date.parse(voucher.validFrom)) {
    return { ok: false, error: 'The end date must be after the start date.' };
  }
  let maxRedemptions: number | null = null;
  if (edit.maxRedemptions.trim()) {
    const n = wholeNumber(edit.maxRedemptions);
    const taken = voucher.reservedCount + voucher.redemptionCount;
    if (n === null || n < 1) return { ok: false, error: 'The cap must be at least 1.' };
    if (n < taken) {
      return { ok: false, error: `${taken} uses are already taken; the cap cannot go below that.` };
    }
    maxRedemptions = n;
  }
  if (edit.note.length > MAX_NOTE) {
    return { ok: false, error: `The note can be at most ${MAX_NOTE} characters.` };
  }
  return { ok: true, request: { validTo, maxRedemptions, note: optional(edit.note) ?? null } };
}

export function describeVoucherValue(voucher: Pick<AdminVoucher, 'type' | 'value'>): string {
  switch (voucher.type) {
    case 'FREE_ADDON':
      return 'Free';
    case 'PERCENT_OFF':
      return `${voucher.value ?? 0}% off`;
    case 'FLAT_OFF':
      return `${formatRupees(voucher.value ?? 0)} off`;
  }
}

export function voucherUsage(voucher: AdminVoucher): string {
  const cap = voucher.maxRedemptions != null ? ` / ${voucher.maxRedemptions}` : '';
  const held = voucher.reservedCount > 0 ? ` (+${voucher.reservedCount} held)` : '';
  return `${voucher.redemptionCount}${cap}${held}`;
}

/** The add-on name is looked up by the caller, so this file imports no catalogue data. */
export function describeVoucherTarget(
  voucher: Pick<AdminVoucher, 'target' | 'addOnCode' | 'planCode' | 'planName'>,
  addOnName?: (code: string) => string | undefined,
): string {
  if (voucher.target === 'PLAN') return `Plan: ${voucher.planName ?? voucher.planCode ?? ''}`;
  const code = voucher.addOnCode ?? '';
  return `Add-on: ${addOnName?.(code) ?? code}`;
}

/** The API returns a plain list per page, so a short page is the last one. */
export function isLastVoucherPage(rowCount: number, size = VOUCHER_PAGE_SIZE): boolean {
  return rowCount < size;
}
