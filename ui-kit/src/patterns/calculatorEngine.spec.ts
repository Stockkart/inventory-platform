import { describe, expect, it } from 'vitest';
import {
  calculatorReducer,
  createCalculatorState,
  formatDisplay,
  formatNumber,
  DIVIDE_BY_ZERO,
  MAX_ENTRY_DIGITS,
  MAX_TAPE_ENTRIES,
  type CalculatorAction,
  type CalculatorState,
} from './calculatorEngine';

/** Type a sequence of keys against a fresh (or supplied) state. */
function run(actions: CalculatorAction[], from?: CalculatorState): CalculatorState {
  return actions.reduce(calculatorReducer, from ?? createCalculatorState());
}

function digits(text: string): CalculatorAction[] {
  return [...text].map((ch) =>
    ch === '.' ? ({ type: 'decimal' } as const) : ({ type: 'digit', digit: ch } as const),
  );
}

describe('digit entry', () => {
  it('replaces the initial zero rather than appending to it', () => {
    expect(run(digits('7')).entry).toBe('7');
    expect(run(digits('70')).entry).toBe('70');
  });

  it('allows only one decimal point', () => {
    expect(run([...digits('1.5'), { type: 'decimal' }, { type: 'digit', digit: '2' }]).entry).toBe(
      '1.52',
    );
  });

  it('starts "0." when a decimal opens the entry', () => {
    expect(run([{ type: 'decimal' }, { type: 'digit', digit: '5' }]).entry).toBe('0.5');
  });

  it('caps the entry at MAX_ENTRY_DIGITS and drops the overflow silently', () => {
    const typed = run(digits('1234567890123456'));
    expect(typed.entry).toHaveLength(MAX_ENTRY_DIGITS);
    expect(typed.error).toBeNull();
  });
});

describe('chain arithmetic', () => {
  it('evaluates left to right with no operator precedence', () => {
    const state = run([
      ...digits('2'),
      { type: 'operator', op: '+' },
      ...digits('3'),
      { type: 'operator', op: '*' },
      ...digits('4'),
      { type: 'equals' },
    ]);
    expect(state.entry).toBe('20');
  });

  it('emits one tape row per committed operation — two for 2 + 3 x 4 =', () => {
    const state = run([
      ...digits('2'),
      { type: 'operator', op: '+' },
      ...digits('3'),
      { type: 'operator', op: '*' },
      ...digits('4'),
      { type: 'equals' },
    ]);
    expect(state.tape.map((row) => `${row.expression} -> ${row.result}`)).toEqual([
      '5 × 4 = -> 20',
      '2 + 3 -> 5',
    ]);
  });

  it('pushes no row when an operator has nothing pending to commit', () => {
    expect(run([...digits('2'), { type: 'operator', op: '+' }]).tape).toHaveLength(0);
  });

  it('replaces the pending operator when two are pressed in a row', () => {
    const state = run([
      ...digits('5'),
      { type: 'operator', op: '+' },
      { type: 'operator', op: '*' },
      ...digits('3'),
      { type: 'equals' },
    ]);
    expect(state.entry).toBe('15');
    expect(state.tape).toHaveLength(1);
  });

  it('replays the last operation on a repeated equals', () => {
    const once = run([
      ...digits('5'),
      { type: 'operator', op: '*' },
      ...digits('4'),
      { type: 'equals' },
    ]);
    expect(once.entry).toBe('20');
    const twice = calculatorReducer(once, { type: 'equals' });
    expect(twice.entry).toBe('80');
    expect(twice.tape).toHaveLength(2);
  });
});

describe('errors', () => {
  it('reports divide by zero and ignores everything but a clear', () => {
    const errored = run([
      ...digits('9'),
      { type: 'operator', op: '/' },
      ...digits('0'),
      { type: 'equals' },
    ]);
    expect(errored.error).toBe(DIVIDE_BY_ZERO);
    expect(formatDisplay(errored)).toBe('Error');

    const ignored = calculatorReducer(errored, { type: 'digit', digit: '5' });
    expect(ignored).toBe(errored);

    const cleared = calculatorReducer(errored, { type: 'clearAll' });
    expect(cleared.error).toBeNull();
    expect(cleared.entry).toBe('0');
    expect(cleared.accumulator).toBeNull();
  });
});

describe('percent', () => {
  it.each([
    ['+' as const, '110'],
    ['-' as const, '90'],
  ])('treats %s as a share of the accumulator', (op, expected) => {
    const state = run([
      ...digits('100'),
      { type: 'operator', op },
      ...digits('10'),
      { type: 'percent' },
      { type: 'equals' },
    ]);
    expect(state.entry).toBe(expected);
  });

  it.each([
    ['*' as const, '10'],
    ['/' as const, '1000'],
  ])('treats %s as a plain n/100', (op, expected) => {
    const state = run([
      ...digits('100'),
      { type: 'operator', op },
      ...digits('10'),
      { type: 'percent' },
      { type: 'equals' },
    ]);
    expect(state.entry).toBe(expected);
  });

  it('is n/100 with no pending operation', () => {
    expect(run([...digits('50'), { type: 'percent' }]).entry).toBe('0.5');
  });
});

describe('entry editing', () => {
  it('negates the entry', () => {
    expect(run([...digits('12'), { type: 'negate' }]).entry).toBe('-12');
  });

  it('backspaces down to zero', () => {
    expect(run([...digits('12'), { type: 'backspace' }]).entry).toBe('1');
    expect(run([...digits('1'), { type: 'backspace' }]).entry).toBe('0');
  });

  it('ignores backspace when the display holds a result, not an entry', () => {
    const result = run([
      ...digits('6'),
      { type: 'operator', op: '+' },
      ...digits('1'),
      { type: 'equals' },
    ]);
    expect(calculatorReducer(result, { type: 'backspace' })).toBe(result);
  });

  it('clearEntry keeps the pending operation, clearAll drops it', () => {
    const pending = run([...digits('8'), { type: 'operator', op: '*' }, ...digits('3')]);
    expect(calculatorReducer(pending, { type: 'clearEntry' }).pendingOp).toBe('*');
    expect(calculatorReducer(pending, { type: 'clearAll' }).pendingOp).toBeNull();
  });
});

describe('memory', () => {
  it('adds, subtracts, recalls and clears', () => {
    let state = run([...digits('10'), { type: 'memoryAdd' }]);
    expect(state.memory).toBe(10);

    state = run([...digits('4'), { type: 'memorySubtract' }], state);
    expect(state.memory).toBe(6);

    state = calculatorReducer(state, { type: 'memoryRecall' });
    expect(state.entry).toBe('6');

    state = calculatorReducer(state, { type: 'memoryClear' });
    expect(state.memory).toBe(0);
  });
});

describe('tape', () => {
  it('recalls a row without discarding the pending operation', () => {
    const pending = run([...digits('12'), { type: 'operator', op: '+' }]);
    const recalled = calculatorReducer(pending, { type: 'recallTape', value: '30' });
    expect(recalled.pendingOp).toBe('+');
    expect(calculatorReducer(recalled, { type: 'equals' }).entry).toBe('42');
  });

  it('parses a grouped result back into a number', () => {
    const recalled = calculatorReducer(createCalculatorState(), {
      type: 'recallTape',
      value: '1,234',
    });
    expect(recalled.entry).toBe('1234');
  });

  it('keeps newest first and caps at MAX_TAPE_ENTRIES', () => {
    let state = createCalculatorState();
    for (let i = 0; i < MAX_TAPE_ENTRIES + 5; i += 1) {
      state = run(
        [...digits('1'), { type: 'operator', op: '+' }, ...digits('1'), { type: 'equals' }],
        state,
      );
    }
    expect(state.tape).toHaveLength(MAX_TAPE_ENTRIES);
    expect(state.tape[0].id).not.toBe(state.tape[1].id);
  });

  it('clears', () => {
    const state = run([
      ...digits('1'),
      { type: 'operator', op: '+' },
      ...digits('1'),
      { type: 'equals' },
    ]);
    expect(calculatorReducer(state, { type: 'clearTape' }).tape).toHaveLength(0);
  });
});

describe('formatting', () => {
  it('groups in the Indian system', () => {
    expect(formatNumber(100000)).toBe('1,00,000');
  });

  it('trims binary float noise', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
  });

  it('keeps a trailing decimal point visible while typing', () => {
    expect(formatDisplay(run([...digits('12'), { type: 'decimal' }]))).toBe('12.');
  });
});

describe('hydrate', () => {
  it('restores memory and a capped tape', () => {
    const state = calculatorReducer(createCalculatorState(), {
      type: 'hydrate',
      memory: 42,
      tape: Array.from({ length: MAX_TAPE_ENTRIES + 3 }, (_, i) => ({
        id: `t${i}`,
        expression: '1 + 1',
        result: '2',
      })),
    });
    expect(state.memory).toBe(42);
    expect(state.tape).toHaveLength(MAX_TAPE_ENTRIES);
  });
});
