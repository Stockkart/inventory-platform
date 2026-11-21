import { describe, expect, it } from 'vitest';
import type { PlanVoucherPreviewResponse } from '@inventory-platform/plan/types';
import { describePlanVoucherPreview, previewRequestFor } from './planVoucherPreview';
import { emptyVoucherForm } from './voucherForm';

const preview = (over: Partial<PlanVoucherPreviewResponse> = {}): PlanVoucherPreviewResponse => ({
  planCode: 'STARTER',
  planName: 'Starter',
  price: 7999,
  discount: 1000,
  priceAfter: 6999,
  basePrice: 4999,
  floor: 4999,
  maxFlat: 3000,
  maxPercent: 37.5,
  allowed: true,
  message: null,
  ...over,
});

describe('describePlanVoucherPreview', () => {
  it('writes the price line from the API figures', () => {
    expect(describePlanVoucherPreview(preview())).toEqual({
      text: 'Starter ₹7,999.00 → ₹6,999.00 · base ₹4,999.00 · max ₹3,000.00 off (37.50%)',
      allowed: true,
    });
  });

  it('falls back to the minimum when the plan has no base price', () => {
    const { text } = describePlanVoucherPreview(preview({ basePrice: null, floor: 1 }));
    expect(text).toBe('Starter ₹7,999.00 → ₹6,999.00 · minimum ₹1.00 · max ₹3,000.00 off (37.50%)');
  });

  it('leaves out the max when the API sent none', () => {
    const { text } = describePlanVoucherPreview(preview({ maxFlat: null, maxPercent: null }));
    expect(text).toBe('Starter ₹7,999.00 → ₹6,999.00 · base ₹4,999.00');
  });

  it('shows the max without a percent when the API sent none', () => {
    const { text } = describePlanVoucherPreview(preview({ maxPercent: null }));
    expect(text).toBe('Starter ₹7,999.00 → ₹6,999.00 · base ₹4,999.00 · max ₹3,000.00 off');
  });

  it('leaves out base and minimum when the API sent neither', () => {
    const { text } = describePlanVoucherPreview(
      preview({ basePrice: null, floor: null, maxFlat: null, maxPercent: null }),
    );
    expect(text).toBe('Starter ₹7,999.00 → ₹6,999.00');
  });

  it('shows the API message when not allowed', () => {
    const result = describePlanVoucherPreview(
      preview({ allowed: false, message: 'Discount exceeds the maximum of ₹3,000.' }),
    );
    expect(result).toEqual({ text: 'Discount exceeds the maximum of ₹3,000.', allowed: false });
  });
});

describe('previewRequestFor', () => {
  const plan = { ...emptyVoucherForm('', 'STARTER'), type: 'FLAT_OFF' as const, value: '1000' };

  it('builds a request once plan, type and value are usable', () => {
    expect(previewRequestFor(plan)).toEqual({ planCode: 'STARTER', type: 'FLAT_OFF', value: 1000 });
  });

  it('is null for add-on vouchers, no plan or a bad value', () => {
    expect(previewRequestFor(emptyVoucherForm('EXTRA_SEAT'))).toBeNull();
    expect(previewRequestFor({ ...plan, planCode: '' })).toBeNull();
    expect(previewRequestFor({ ...plan, value: '' })).toBeNull();
    expect(previewRequestFor({ ...plan, value: '0' })).toBeNull();
    expect(previewRequestFor({ ...plan, type: 'PERCENT_OFF', value: '101' })).toBeNull();
  });
});
