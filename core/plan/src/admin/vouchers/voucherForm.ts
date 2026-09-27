import type {
  AdminVoucher,
  VoucherGenerateRequest,
  VoucherType,
  VoucherUpdateRequest,
} from '@inventory-platform/plan/types';
import { endOfDayIst, istDay, startOfDayIst } from '../dates';

/** Mirrors VoucherAdminValidator so most mistakes show before the request. */
export const VOUCHER_MAX_BATCH = 500;
const CODE = /^[A-Z0-9][A-Z0-9-]{3,29}$/;
const PREFIX = /^[A-Z0-9]{1,8}$/;
const MAX_NOTE = 500;

export const VOUCHER_TYPE_LABEL: Record<VoucherType, string> = {
  FREE_ADDON: 'Free add-on',
  PERCENT_OFF: 'Percent off',
  FLAT_OFF: 'Flat ₹ off',
};

export interface VoucherFormState {
  mode: 'single' | 'batch';
  code: string;
  count: string;
  prefix: string;
  addOnCode: string;
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

export const emptyVoucherForm = (addOnCode = ''): VoucherFormState => ({
  mode: 'single',
  code: '',
  count: '10',
  prefix: '',
  addOnCode,
  type: 'FREE_ADDON',
  value: '',
  quantity: '1',
  maxRedemptions: '1',
  singleUsePerShop: true,
  issuedToShopId: '',
  validFrom: '',
  validTo: '',
  note: '',
});

function wholeNumber(input: string): number | null {
  return /^\d+$/.test(input.trim()) ? Number(input.trim()) : null;
}

function optional(input: string): string | undefined {
  const trimmed = input.trim();
  return trimmed ? trimmed : undefined;
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

  if (!form.addOnCode) errors.addOnCode = 'Choose an add-on.';

  let value: number | undefined;
  if (form.type !== 'FREE_ADDON') {
    const parsed = Number(form.value);
    if (!form.value.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      errors.value = 'Enter a value above 0.';
    } else if (form.type === 'PERCENT_OFF' && parsed > 100) {
      errors.value = 'At most 100%.';
    } else {
      value = parsed;
    }
  }

  const quantity = wholeNumber(form.quantity);
  if (quantity === null || quantity < 1) errors.quantity = 'At least 1.';

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
      addOnCode: form.addOnCode,
      type: form.type,
      value,
      quantity: quantity ?? 1,
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
      return `₹${(voucher.value ?? 0).toLocaleString('en-IN')} off`;
  }
}

export function voucherUsage(voucher: AdminVoucher): string {
  const cap = voucher.maxRedemptions != null ? ` / ${voucher.maxRedemptions}` : '';
  const held = voucher.reservedCount > 0 ? ` (+${voucher.reservedCount} held)` : '';
  return `${voucher.redemptionCount}${cap}${held}`;
}
