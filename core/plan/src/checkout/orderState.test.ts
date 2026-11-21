import { describe, expect, it } from 'vitest';
import { confirmingMessage, orderStage } from './orderState';

describe('orderStage', () => {
  it('opens the gateway only for an unpaid order', () => {
    expect(orderStage('CREATED')).toBe('open');
    expect(orderStage('PAYMENT_PENDING')).toBe('open');
    expect(orderStage(undefined)).toBe('open');
    expect(orderStage(null)).toBe('open');
  });

  it('never reopens the gateway once the money is in', () => {
    expect(orderStage('PAID')).toBe('confirming');
    expect(orderStage('FULFILLING')).toBe('confirming');
    expect(orderStage('FULFILMENT_FAILED')).toBe('confirming');
  });

  it('is done only when fulfilled', () => {
    expect(orderStage('FULFILLED')).toBe('done');
  });

  it('treats failed, expired, cancelled and refunded orders as closed', () => {
    for (const status of ['PAYMENT_FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED', 'FAILED']) {
      expect(orderStage(status)).toBe('closed');
    }
  });
});

describe('confirmingMessage', () => {
  it('says the payment is in', () => {
    expect(confirmingMessage('PAID')).toMatch(/Payment received/);
    expect(confirmingMessage('FULFILMENT_FAILED')).toMatch(/could not apply/);
  });
});
