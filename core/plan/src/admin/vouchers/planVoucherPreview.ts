import type {
  PlanVoucherPreviewRequest,
  PlanVoucherPreviewResponse,
} from '@inventory-platform/plan/types';
import { formatRupees } from '../../ui/planPricing';
import type { VoucherFormState } from './voucherForm';

/** The request the preview needs, or null while the form cannot be priced yet. */
export function previewRequestFor(form: VoucherFormState): PlanVoucherPreviewRequest | null {
  if (form.target !== 'PLAN' || !form.planCode || form.type === 'FREE_ADDON') return null;
  const value = Number(form.value);
  if (!form.value.trim() || !Number.isFinite(value) || value <= 0) return null;
  if (form.type === 'PERCENT_OFF' && value > 100) return null;
  return { planCode: form.planCode, type: form.type, value };
}

export interface PlanVoucherPreviewLine {
  text: string;
  allowed: boolean;
}

/** Every figure comes from the API; this only joins them into one line. */
export function describePlanVoucherPreview(
  preview: PlanVoucherPreviewResponse,
): PlanVoucherPreviewLine {
  if (!preview.allowed)
    return { text: preview.message ?? 'This voucher is not allowed.', allowed: false };
  const parts = [
    `${preview.planName} ${formatRupees(preview.price)} → ${formatRupees(preview.priceAfter)}`,
  ];
  if (preview.basePrice != null) parts.push(`base ${formatRupees(preview.basePrice)}`);
  else if (preview.floor != null) parts.push(`minimum ${formatRupees(preview.floor)}`);
  if (preview.maxFlat != null) {
    const percent = preview.maxPercent != null ? ` (${preview.maxPercent.toFixed(2)}%)` : '';
    parts.push(`max ${formatRupees(preview.maxFlat)} off${percent}`);
  }
  return { text: parts.join(' · '), allowed: true };
}
