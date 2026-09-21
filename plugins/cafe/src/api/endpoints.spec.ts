import { describe, expect, it } from 'vitest';
import { CAFE_ORDER_ENDPOINTS } from './endpoints';

describe('CAFE_ORDER_ENDPOINTS', () => {
  it('addresses orders and tickets under the cafe namespace', () => {
    expect(CAFE_ORDER_ENDPOINTS.ORDERS).toBe('/cafe/orders');
    expect(CAFE_ORDER_ENDPOINTS.ORDER('o1')).toBe('/cafe/orders/o1');
    expect(CAFE_ORDER_ENDPOINTS.PUNCH('o1')).toBe('/cafe/orders/o1/kots');
    expect(CAFE_ORDER_ENDPOINTS.KOT_DOCUMENT('k1')).toBe('/cafe/kots/k1/document');
  });

  it('encodes ids so a stray slash cannot escape the path', () => {
    expect(CAFE_ORDER_ENDPOINTS.ORDER('a/b')).toBe('/cafe/orders/a%2Fb');
  });
});
