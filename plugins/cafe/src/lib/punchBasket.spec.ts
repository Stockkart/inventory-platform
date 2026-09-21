import { describe, expect, it } from 'vitest';
import {
  createBasket,
  addLine,
  setNote,
  setQuantity,
  removeLine,
  toPunchBody,
  keyAfter,
} from './punchBasket';

describe('punch basket', () => {
  it('carries notes and quantities into the punch body', () => {
    let basket = createBasket();
    basket = addLine(basket, { sellableRef: 'menu:m1', name: 'Biryani' });
    basket = setQuantity(basket, 'menu:m1', 2);
    basket = setNote(basket, 'menu:m1', '  no onion  ');

    expect(toPunchBody(basket)).toEqual({
      lines: [{ sellableRef: 'menu:m1', quantity: 2, note: 'no onion' }],
    });
  });

  it('omits an empty note rather than sending blank text to the pass', () => {
    let basket = createBasket();
    basket = addLine(basket, { sellableRef: 'menu:m1', name: 'Biryani' });

    expect(toPunchBody(basket).lines[0].note).toBeUndefined();
  });

  it('increments quantity when the same item is added twice', () => {
    let basket = createBasket();
    basket = addLine(basket, { sellableRef: 'menu:m1', name: 'Biryani' });
    basket = addLine(basket, { sellableRef: 'menu:m1', name: 'Biryani' });

    expect(basket.lines).toHaveLength(1);
    expect(basket.lines[0].quantity).toBe(2);
  });

  it('removes a line', () => {
    let basket = createBasket();
    basket = addLine(basket, { sellableRef: 'menu:m1', name: 'Biryani' });
    basket = removeLine(basket, 'menu:m1');

    expect(basket.lines).toHaveLength(0);
  });

  it('gives every basket its own key', () => {
    expect(createBasket().key).not.toBe(createBasket().key);
  });
});

describe('keyAfter', () => {
  it('discards the key once the punch has happened', () => {
    expect(keyAfter('SUCCESS', 'k')).toBeNull();
  });

  it('discards the key on a rejection that retrying cannot fix', () => {
    expect(keyAfter('REJECTED', 'k')).toBeNull();
  });

  it('retains the key when the server failed, which may have committed first', () => {
    expect(keyAfter('SERVER_ERROR', 'k')).toBe('k');
  });

  it('retains the key when the request never resolved', () => {
    // The dangerous direction: the punch may have been recorded, and a fresh key
    // would cook the round a second time.
    expect(keyAfter('NETWORK_ERROR', 'k')).toBe('k');
  });
});
