import { describe, expect, it } from 'vitest';
import { outcomeOf } from './outcome';

// Imported from ./outcome (not ./hooks) so this spec never pulls
// @tanstack/react-query / react into the node test environment.
describe('outcomeOf', () => {
  it('classifies a missing response as NETWORK_ERROR', () => {
    expect(outcomeOf({})).toBe('NETWORK_ERROR');
  });

  it('classifies a status of 0 as NETWORK_ERROR, not REJECTED', () => {
    expect(outcomeOf({ response: { status: 0 } })).toBe('NETWORK_ERROR');
  });

  it('classifies a 5xx status as SERVER_ERROR', () => {
    expect(outcomeOf({ response: { status: 500 } })).toBe('SERVER_ERROR');
  });

  it('classifies a 4xx status as REJECTED', () => {
    expect(outcomeOf({ response: { status: 400 } })).toBe('REJECTED');
  });
});
