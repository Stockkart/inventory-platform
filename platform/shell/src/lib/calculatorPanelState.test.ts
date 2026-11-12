import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCalculatorPanelState, saveCalculatorPanelState } from './calculatorPanelState';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

const snapshot = {
  open: true,
  x: 40,
  y: 60,
  memory: 250,
  tape: [{ id: 't1', expression: '2 + 3 =', result: '5' }],
};

describe('calculator panel persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips a snapshot for one shop', () => {
    saveCalculatorPanelState('shop-a', snapshot);
    expect(loadCalculatorPanelState('shop-a')).toMatchObject(snapshot);
  });

  it('keeps each shop separate', () => {
    saveCalculatorPanelState('shop-a', snapshot);
    expect(loadCalculatorPanelState('shop-b')).toBeNull();
  });

  it('stores nothing without a shop', () => {
    saveCalculatorPanelState(null, snapshot);
    saveCalculatorPanelState('  ', snapshot);
    expect(localStorage.length).toBe(0);
    expect(loadCalculatorPanelState(null)).toBeNull();
  });

  it('drops malformed fields and rows instead of throwing', () => {
    localStorage.setItem(
      'sk-calculator-panel:shop-a',
      JSON.stringify({
        version: 1,
        open: 'yes',
        x: 'left',
        y: 10,
        memory: null,
        tape: [{ id: 't1', expression: '1 + 1', result: '2' }, { id: 7 }],
      }),
    );
    expect(loadCalculatorPanelState('shop-a')).toMatchObject({
      open: false,
      x: null,
      y: 10,
      memory: 0,
      tape: [{ id: 't1', expression: '1 + 1', result: '2' }],
    });
  });

  it('returns null for unreadable JSON or another version', () => {
    localStorage.setItem('sk-calculator-panel:shop-a', '{not json');
    expect(loadCalculatorPanelState('shop-a')).toBeNull();
    localStorage.setItem('sk-calculator-panel:shop-a', JSON.stringify({ version: 2 }));
    expect(loadCalculatorPanelState('shop-a')).toBeNull();
  });

  it('swallows storage failures', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    expect(() => saveCalculatorPanelState('shop-a', snapshot)).not.toThrow();
    expect(loadCalculatorPanelState('shop-a')).toBeNull();
  });
});
