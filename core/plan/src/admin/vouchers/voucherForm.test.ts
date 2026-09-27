import { describe, expect, it } from 'vitest';
import type { AdminVoucher } from '@inventory-platform/plan/types';
import {
  describeVoucherValue,
  emptyVoucherForm,
  toGenerateRequest,
  toUpdateRequest,
  voucherEditState,
  voucherUsage,
} from './voucherForm';
import { endOfDayIst, fromIstDateTime, istDateTime, istDay, startOfDayIst } from '../dates';

const voucher = (over: Partial<AdminVoucher> = {}): AdminVoucher => ({
  id: 'v1',
  code: 'WELCOME-1',
  addOnCode: 'EXTRA_SEAT',
  type: 'PERCENT_OFF',
  value: 20,
  quantity: 1,
  maxRedemptions: 10,
  reservedCount: 1,
  redemptionCount: 3,
  singleUsePerShop: true,
  issuedToShopId: null,
  validFrom: '2026-09-30T18:30:00.000Z',
  validTo: '2026-10-31T18:29:59.000Z',
  active: true,
  note: 'Launch',
  batchId: null,
  createdByUserId: 'u1',
  createdAt: '2026-09-27T00:00:00.000Z',
  ...over,
});

describe('IST dates', () => {
  it('maps a calendar day to its IST start and end', () => {
    expect(startOfDayIst('2026-10-01')).toBe('2026-09-30T18:30:00.000Z');
    expect(endOfDayIst('2026-10-31')).toBe('2026-10-31T18:29:59.000Z');
  });

  it('reads an instant back as its IST day and time', () => {
    expect(istDay('2026-09-30T18:30:00.000Z')).toBe('2026-10-01');
    expect(istDay(null)).toBe('');
    expect(istDateTime('2026-09-30T18:30:00.000Z')).toBe('2026-10-01T00:00');
    expect(fromIstDateTime('2026-10-01T00:00')).toBe('2026-09-30T18:30:00.000Z');
  });
});

describe('toGenerateRequest', () => {
  it('builds a single free add-on voucher without a value', () => {
    const result = toGenerateRequest({ ...emptyVoucherForm('EXTRA_SEAT'), code: 'welcome-1' });
    expect(result).toEqual({
      ok: true,
      request: expect.objectContaining({
        code: 'WELCOME-1',
        addOnCode: 'EXTRA_SEAT',
        type: 'FREE_ADDON',
        value: undefined,
        quantity: 1,
        maxRedemptions: 1,
      }),
    });
  });

  it('builds a batch with the prefix and IST validity window', () => {
    const result = toGenerateRequest({
      ...emptyVoucherForm('EXTRA_SEAT'),
      mode: 'batch',
      count: '50',
      prefix: 'diwali',
      type: 'FLAT_OFF',
      value: '99.5',
      maxRedemptions: '',
      validFrom: '2026-10-01',
      validTo: '2026-10-31',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request).toMatchObject({
      count: 50,
      prefix: 'DIWALI',
      value: 99.5,
      maxRedemptions: undefined,
      validFrom: '2026-09-30T18:30:00.000Z',
      validTo: '2026-10-31T18:29:59.000Z',
    });
    expect(result.request.code).toBeUndefined();
  });

  it('reports every rule the server would reject', () => {
    const result = toGenerateRequest({
      ...emptyVoucherForm(),
      mode: 'batch',
      count: '501',
      prefix: 'TOO-LONG-PREFIX',
      type: 'PERCENT_OFF',
      value: '120',
      quantity: '0',
      maxRedemptions: 'x',
      validFrom: '2026-10-10',
      validTo: '2026-10-01',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(
      ['addOnCode', 'count', 'maxRedemptions', 'prefix', 'quantity', 'validTo', 'value'].sort(),
    );
  });

  it('rejects a malformed chosen code', () => {
    const result = toGenerateRequest({ ...emptyVoucherForm('EXTRA_SEAT'), code: 'AB' });
    expect(result.ok).toBe(false);
  });
});

describe('toUpdateRequest', () => {
  it('always sends all three fields because the server replaces them', () => {
    const v = voucher();
    expect(toUpdateRequest(v, voucherEditState(v))).toEqual({
      ok: true,
      request: { validTo: v.validTo, maxRedemptions: 10, note: 'Launch' },
    });
    expect(toUpdateRequest(v, { validTo: '', maxRedemptions: '', note: ' ' })).toEqual({
      ok: true,
      request: { validTo: null, maxRedemptions: null, note: null },
    });
  });

  it('keeps the cap at or above the slots already taken', () => {
    const result = toUpdateRequest(voucher(), {
      ...voucherEditState(voucher()),
      maxRedemptions: '3',
    });
    expect(result).toEqual({ ok: false, error: expect.stringContaining('4 uses') });
  });

  it('keeps the end date after the start', () => {
    const result = toUpdateRequest(voucher(), {
      ...voucherEditState(voucher()),
      validTo: '2026-09-29',
    });
    expect(result.ok).toBe(false);
  });
});

describe('display helpers', () => {
  it('describes the discount and usage', () => {
    expect(describeVoucherValue({ type: 'FREE_ADDON', value: null })).toBe('Free');
    expect(describeVoucherValue({ type: 'PERCENT_OFF', value: 20 })).toBe('20% off');
    expect(describeVoucherValue({ type: 'FLAT_OFF', value: 1500 })).toBe('₹1,500 off');
    expect(voucherUsage(voucher())).toBe('3 / 10 (+1 held)');
    expect(voucherUsage(voucher({ maxRedemptions: null, reservedCount: 0 }))).toBe('3');
  });
});
