import { describe, expect, it } from 'vitest';
import { CAFE_KOT_ENDPOINTS } from './endpoints';

describe('CAFE_KOT_ENDPOINTS', () => {
  it('addresses the punch, document and reprint routes under the cafe namespace', () => {
    expect(CAFE_KOT_ENDPOINTS.PUNCH('p1')).toBe('/cafe/purchases/p1/kots');
    expect(CAFE_KOT_ENDPOINTS.KOT_DOCUMENT('k1')).toBe('/cafe/kots/k1/document');
    expect(CAFE_KOT_ENDPOINTS.KOT_REPRINT('k1')).toBe('/cafe/kots/k1/reprint');
  });

  it('encodes ids so a stray slash cannot escape the path', () => {
    expect(CAFE_KOT_ENDPOINTS.PUNCH('a/b')).toBe('/cafe/purchases/a%2Fb/kots');
    expect(CAFE_KOT_ENDPOINTS.KOT_DOCUMENT('a/b')).toBe('/cafe/kots/a%2Fb/document');
    expect(CAFE_KOT_ENDPOINTS.KOT_REPRINT('a/b')).toBe('/cafe/kots/a%2Fb/reprint');
  });
});
