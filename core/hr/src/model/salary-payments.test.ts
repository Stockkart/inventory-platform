import { describe, expect, it, vi } from 'vitest';
import type { PayrollLineResponse, SalaryPaymentsResponse } from './payroll.types';
import {
  describePaymentSummary,
  payEveryoneInChunks,
  payLinesInChunks,
  paymentStatusText,
  validatePaymentDetails,
  type PaymentDetails,
} from './salary-payments';

const DETAILS: PaymentDetails = { date: '2026-10-05', method: 'BANK', reference: ' UTR1 ' };

function paidResponse(ids: string[], extra: SalaryPaymentsResponse['lines'] = []) {
  return {
    paymentBatchId: ids.length ? 'b' : null,
    paid: ids.length,
    lines: [...ids.map((lineId) => ({ lineId, status: 'PAID' as const })), ...extra],
  };
}

const ids = (n: number, from = 0) => Array.from({ length: n }, (_, i) => `l${from + i}`);

describe('payEveryoneInChunks', () => {
  it('repeats `all` calls until one pays nobody and adds up the outcomes', async () => {
    const pay = vi
      .fn()
      .mockResolvedValueOnce(paidResponse(ids(50)))
      .mockResolvedValueOnce(
        paidResponse(ids(20, 50), [{ lineId: 'x1', status: 'IN_PROGRESS', error: 'busy' }]),
      )
      .mockResolvedValueOnce(paidResponse([]));
    const progress: number[] = [];

    const summary = await payEveryoneInChunks(pay, DETAILS, 71, (n) => progress.push(n));

    expect(pay).toHaveBeenCalledTimes(3);
    for (const [body] of pay.mock.calls) {
      // `all` with no ids; the reference is trimmed like the server does.
      expect(body).toEqual({
        lineIds: [],
        all: true,
        date: '2026-10-05',
        method: 'BANK',
        reference: 'UTR1',
      });
    }
    expect(progress).toEqual([50, 70, 70]);
    expect(summary).toMatchObject({ paid: 70, inProgress: ['x1'], calls: 3, error: null });
  });

  it('never loops past the pending count plus two spare calls', async () => {
    const pay = vi.fn().mockResolvedValue(paidResponse(['same']));
    const summary = await payEveryoneInChunks(pay, DETAILS, 10);
    expect(pay).toHaveBeenCalledTimes(3); // ceil(10 / 50) + 2
    expect(summary.paid).toBe(3);
  });

  it('stops at a failed call and keeps what was paid before it', async () => {
    const pay = vi
      .fn()
      .mockResolvedValueOnce(paidResponse(ids(50)))
      .mockRejectedValueOnce(
        new Error('This payroll run is being reopened. Try again in a minute'),
      );
    const summary = await payEveryoneInChunks(pay, DETAILS, 80);
    expect(summary.paid).toBe(50);
    expect(summary.error?.message).toMatch(/being reopened/);
  });
});

describe('payLinesInChunks', () => {
  it('sends at most 50 line ids per call', async () => {
    const pay = vi.fn(async (body: { lineIds: string[] }) => paidResponse(body.lineIds));
    const summary = await payLinesInChunks(pay, DETAILS, ids(120));
    expect(pay.mock.calls.map(([b]) => b.lineIds.length)).toEqual([50, 50, 20]);
    expect(summary.paid).toBe(120);
  });

  it('reports lines paid before', async () => {
    const pay = vi.fn().mockResolvedValue({
      paid: 0,
      lines: [{ lineId: 'l1', status: 'ALREADY_PAID' }],
    });
    const summary = await payLinesInChunks(pay, DETAILS, ['l1']);
    expect(describePaymentSummary(summary, () => 'Asha')).toEqual([
      'Nobody new was paid.',
      'Already paid before: Asha.',
    ]);
  });
});

describe('payment rules', () => {
  it('allows dates from the first of the month up to today', () => {
    const ok = validatePaymentDetails({ ...DETAILS, date: '2026-09-01' }, '2026-09', '2026-10-05');
    expect(ok).toBeNull();
    expect(
      validatePaymentDetails({ ...DETAILS, date: '2026-08-31' }, '2026-09', '2026-10-05'),
    ).toBe('The payment date cannot be before 1 Sep 2026.');
    expect(
      validatePaymentDetails({ ...DETAILS, date: '2026-10-06' }, '2026-09', '2026-10-05'),
    ).toBe('The payment date cannot be in the future.');
    expect(
      validatePaymentDetails({ ...DETAILS, reference: 'x'.repeat(101) }, '2026-09', '2026-10-05'),
    ).toMatch(/at most 100/);
  });

  it('says Pending or Paid on <date> by <method>', () => {
    const line = { paymentStatus: null } as PayrollLineResponse;
    expect(paymentStatusText(line)).toBe('Pending');
    expect(
      paymentStatusText({
        ...line,
        paymentStatus: 'PAID',
        paidAt: '2026-10-09',
        paymentMethod: 'UPI',
      }),
    ).toBe('Paid on 9 Oct 2026 by UPI');
    expect(paymentStatusText({ ...line, paymentStatus: 'PAYING' })).toBe('Being paid');
  });
});
