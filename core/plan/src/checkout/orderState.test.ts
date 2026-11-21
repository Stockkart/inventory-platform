import { describe, expect, it } from 'vitest';
import { confirmingMessage, orderStage } from './orderState';

describe('orderStage', () => {
  it('opens the gateway only for an unpaid order', () => {
    expect(orderStage({ status: 'CREATED' })).toBe('open');
    expect(orderStage({ status: 'PAYMENT_PENDING' })).toBe('open');
    expect(orderStage({})).toBe('open');
    expect(orderStage({ status: null })).toBe('open');
  });

  it('never reopens the gateway once the money is in', () => {
    expect(orderStage({ status: 'PAID' })).toBe('confirming');
    expect(orderStage({ status: 'FULFILLING' })).toBe('confirming');
    expect(orderStage({ status: 'FULFILMENT_FAILED' })).toBe('confirming');
  });

  it('is done only when fulfilled', () => {
    expect(orderStage({ status: 'FULFILLED' })).toBe('done');
  });

  it('treats failed, expired, cancelled and refunded orders as closed', () => {
    for (const status of ['PAYMENT_FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED', 'FAILED']) {
      expect(orderStage({ status })).toBe('closed');
    }
  });
});

describe('confirmingMessage', () => {
  it('says the payment is in', () => {
    expect(confirmingMessage('PAID')).toMatch(/Payment received/);
    expect(confirmingMessage('FULFILMENT_FAILED')).toMatch(/could not apply/);
  });
});

describe('orderStage with the API phase', () => {
  it('follows the phase over the raw status', () => {
    expect(orderStage({ phase: 'AWAITING_PAYMENT', status: 'CREATED' })).toBe('open');
    expect(orderStage({ phase: 'PROCESSING', status: 'FULFILMENT_FAILED' })).toBe('confirming');
    expect(orderStage({ phase: 'FULFILLED' })).toBe('done');
    expect(orderStage({ phase: 'FAILED', status: 'PAYMENT_FAILED' })).toBe('closed');
    expect(orderStage({ phase: 'ENDED', status: 'CANCELLED' })).toBe('closed');
  });
});
