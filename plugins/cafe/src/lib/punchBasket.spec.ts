import { describe, expect, it } from 'vitest';
import { newKey, keyAfter } from './punchBasket';

describe('newKey', () => {
  it('gives every punch attempt its own key', () => {
    expect(newKey()).not.toBe(newKey());
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
