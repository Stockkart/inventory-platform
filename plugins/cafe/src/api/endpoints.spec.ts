import { describe, expect, it } from 'vitest';
import { CAFE_KOT_ENDPOINTS, CAFE_TAB_ENDPOINTS } from './endpoints';

describe('CAFE_KOT_ENDPOINTS', () => {
  it('addresses the document and reprint routes under the cafe namespace', () => {
    expect(CAFE_KOT_ENDPOINTS.KOT_DOCUMENT('k1')).toBe('/cafe/kots/k1/document');
    expect(CAFE_KOT_ENDPOINTS.KOT_REPRINT('k1')).toBe('/cafe/kots/k1/reprint');
  });

  it('encodes ids so a stray slash cannot escape the path', () => {
    expect(CAFE_KOT_ENDPOINTS.KOT_DOCUMENT('a/b')).toBe('/cafe/kots/a%2Fb/document');
    expect(CAFE_KOT_ENDPOINTS.KOT_REPRINT('a/b')).toBe('/cafe/kots/a%2Fb/reprint');
  });
});

describe('CAFE_TAB_ENDPOINTS', () => {
  it('addresses the tab collection and its lifecycle routes', () => {
    expect(CAFE_TAB_ENDPOINTS.TABS()).toBe('/cafe/tabs');
    expect(CAFE_TAB_ENDPOINTS.TAB('t1')).toBe('/cafe/tabs/t1');
    expect(CAFE_TAB_ENDPOINTS.TAB_LINES('t1')).toBe('/cafe/tabs/t1/lines');
    expect(CAFE_TAB_ENDPOINTS.TAB_LINE('t1', 'l1')).toBe('/cafe/tabs/t1/lines/l1');
    expect(CAFE_TAB_ENDPOINTS.TAB_FLUSH('t1')).toBe('/cafe/tabs/t1/flush');
  });

  it('encodes ids so a stray slash cannot escape the path', () => {
    expect(CAFE_TAB_ENDPOINTS.TAB('a/b')).toBe('/cafe/tabs/a%2Fb');
    expect(CAFE_TAB_ENDPOINTS.TAB_LINES('a/b')).toBe('/cafe/tabs/a%2Fb/lines');
    expect(CAFE_TAB_ENDPOINTS.TAB_LINE('a/b', 'c/d')).toBe('/cafe/tabs/a%2Fb/lines/c%2Fd');
    expect(CAFE_TAB_ENDPOINTS.TAB_FLUSH('a/b')).toBe('/cafe/tabs/a%2Fb/flush');
  });
});
