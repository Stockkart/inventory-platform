/**
 * Desk-calculator engine — pure, DOM-free and React-free so it can be unit tested.
 *
 * Chain arithmetic, left to right, with no operator precedence: `2 + 3 × 4 =` is
 * 20, not 14. That is what a calculator beside a billing screen is expected to do,
 * and it is what makes every tape row a completed step.
 */

export type CalculatorOp = '+' | '-' | '*' | '/';

export interface TapeEntry {
  id: string;
  expression: string;
  result: string;
}

export interface CalculatorState {
  /** Exactly as typed, so "12." and "-0" survive round trips. */
  entry: string;
  accumulator: number | null;
  pendingOp: CalculatorOp | null;
  /** Replayed when `=` is pressed repeatedly. */
  lastOp: CalculatorOp | null;
  lastOperand: number | null;
  /** The next digit starts a new entry (set after `=`, an operator or a recall). */
  overwrite: boolean;
  memory: number;
  error: string | null;
  tape: TapeEntry[];
  /** Monotonic, so ids stay deterministic under test. */
  nextId: number;
}

export type CalculatorAction =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'operator'; op: CalculatorOp }
  | { type: 'equals' }
  | { type: 'percent' }
  | { type: 'negate' }
  | { type: 'backspace' }
  | { type: 'clearEntry' }
  | { type: 'clearAll' }
  | { type: 'memoryClear' }
  | { type: 'memoryRecall' }
  | { type: 'memoryAdd' }
  | { type: 'memorySubtract' }
  | { type: 'clearTape' }
  | { type: 'recallTape'; value: string }
  | { type: 'hydrate'; memory: number; tape: TapeEntry[] };

export const MAX_ENTRY_DIGITS = 12;
export const MAX_TAPE_ENTRIES = 50;
export const DIVIDE_BY_ZERO = 'Cannot divide by zero';
export const OVERFLOW = 'Result is out of range';

const OP_GLYPH: Record<CalculatorOp, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };

export function createCalculatorState(init?: {
  memory?: number;
  tape?: TapeEntry[];
}): CalculatorState {
  return {
    entry: '0',
    accumulator: null,
    pendingOp: null,
    lastOp: null,
    lastOperand: null,
    overwrite: true,
    memory: Number.isFinite(init?.memory) ? (init?.memory as number) : 0,
    error: null,
    tape: init?.tape ? init.tape.slice(0, MAX_TAPE_ENTRIES) : [],
    nextId: 1,
  };
}

/** Trim float noise, then group for display. `en-IN` matches the rest of the product. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '';
  const trimmed = Number(value.toPrecision(12));
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 10 }).format(trimmed);
}

/** The same number without grouping — used when a value re-enters the calculator. */
function toEntryString(value: number): string {
  return String(Number(value.toPrecision(12)));
}

export function toNumber(entry: string): number {
  const parsed = Number.parseFloat(entry);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatDisplay(state: CalculatorState): string {
  if (state.error) return 'Error';
  // Keep a trailing '.' or '-' visible while it is being typed.
  const [intPart, fracPart] = state.entry.split('.');
  const grouped = formatNumber(Number.parseFloat(intPart || '0'));
  const signed = intPart.startsWith('-') && grouped === '0' ? `-${grouped}` : grouped;
  if (fracPart === undefined) return signed;
  return `${signed}.${fracPart}`;
}

/** The pending step shown above the readout, e.g. "1,200 ×". */
export function formatPending(state: CalculatorState): string {
  if (state.error || state.pendingOp === null || state.accumulator === null) return '';
  return `${formatNumber(state.accumulator)} ${OP_GLYPH[state.pendingOp]}`;
}

function countDigits(entry: string): number {
  return entry.replace(/[-.]/g, '').replace(/^0+(?=\d)/, '').length;
}

function apply(a: number, op: CalculatorOp, b: number): { value: number } | { error: string } {
  if (op === '/' && b === 0) return { error: DIVIDE_BY_ZERO };
  let value: number;
  switch (op) {
    case '+':
      value = a + b;
      break;
    case '-':
      value = a - b;
      break;
    case '*':
      value = a * b;
      break;
    case '/':
      value = a / b;
      break;
  }
  if (!Number.isFinite(value)) return { error: OVERFLOW };
  return { value };
}

function pushTape(state: CalculatorState, expression: string, result: string): TapeEntry[] {
  const entry: TapeEntry = { id: `t${state.nextId}`, expression, result };
  return [entry, ...state.tape].slice(0, MAX_TAPE_ENTRIES);
}

/**
 * Commit the pending operation against `operand`, pushing one tape row.
 * With nothing pending, the operand simply becomes the accumulator and no row is
 * emitted — that is the single rule behind when the tape grows.
 */
function commit(
  state: CalculatorState,
  operand: number,
  op: CalculatorOp,
  suffix: string,
): CalculatorState {
  if (state.accumulator === null || state.pendingOp === null) {
    return { ...state, accumulator: operand, pendingOp: op, overwrite: true };
  }
  const outcome = apply(state.accumulator, state.pendingOp, operand);
  if ('error' in outcome) {
    return {
      ...state,
      error: outcome.error,
      accumulator: null,
      pendingOp: null,
      lastOp: null,
      lastOperand: null,
      overwrite: true,
    };
  }
  const expression = `${formatNumber(state.accumulator)} ${
    OP_GLYPH[state.pendingOp]
  } ${formatNumber(operand)}${suffix}`;
  const result = formatNumber(outcome.value);
  return {
    ...state,
    entry: toEntryString(outcome.value),
    accumulator: outcome.value,
    pendingOp: op,
    tape: pushTape(state, expression, result),
    nextId: state.nextId + 1,
    overwrite: true,
  };
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  // While in error only the clears and a hydrate get through, so a stray digit
  // cannot silently resume against a garbage accumulator.
  if (
    state.error &&
    action.type !== 'clearAll' &&
    action.type !== 'clearEntry' &&
    action.type !== 'memoryClear' &&
    action.type !== 'clearTape' &&
    action.type !== 'hydrate'
  ) {
    return state;
  }

  switch (action.type) {
    case 'digit': {
      if (state.overwrite) {
        return { ...state, entry: action.digit, overwrite: false };
      }
      if (countDigits(state.entry) >= MAX_ENTRY_DIGITS) return state;
      const next = state.entry === '0' ? action.digit : `${state.entry}${action.digit}`;
      return { ...state, entry: next };
    }

    case 'decimal': {
      if (state.overwrite) return { ...state, entry: '0.', overwrite: false };
      if (state.entry.includes('.')) return state;
      return { ...state, entry: `${state.entry}.` };
    }

    case 'operator':
      // An operator pressed straight after another one replaces it rather than
      // committing: `5 + ×` is one pending multiply, not `5 + 5`.
      if (state.pendingOp !== null && state.overwrite) {
        return { ...state, pendingOp: action.op };
      }
      return commit(state, toNumber(state.entry), action.op, '');

    case 'equals': {
      // Nothing pending: repeat the last operation, which is what a second `=` means.
      if (state.pendingOp === null || state.accumulator === null) {
        if (state.lastOp === null || state.lastOperand === null) return state;
        const current = toNumber(state.entry);
        const outcome = apply(current, state.lastOp, state.lastOperand);
        if ('error' in outcome) {
          return { ...state, error: outcome.error, overwrite: true };
        }
        const expression = `${formatNumber(current)} ${OP_GLYPH[state.lastOp]} ${formatNumber(
          state.lastOperand,
        )} =`;
        return {
          ...state,
          entry: toEntryString(outcome.value),
          tape: pushTape(state, expression, formatNumber(outcome.value)),
          nextId: state.nextId + 1,
          overwrite: true,
        };
      }
      const operand = toNumber(state.entry);
      const op = state.pendingOp;
      const committed = commit(state, operand, op, ' =');
      if (committed.error) return committed;
      return {
        ...committed,
        accumulator: null,
        pendingOp: null,
        lastOp: op,
        lastOperand: operand,
      };
    }

    case 'percent': {
      const current = toNumber(state.entry);
      // Additive percent is relative to the accumulator (a discount off a total);
      // multiplicative percent is plain n/100.
      const relative =
        (state.pendingOp === '+' || state.pendingOp === '-') && state.accumulator !== null;
      const value = relative ? ((state.accumulator as number) * current) / 100 : current / 100;
      return { ...state, entry: toEntryString(value), overwrite: true };
    }

    case 'negate': {
      const current = toNumber(state.entry);
      if (current === 0) return state;
      return { ...state, entry: toEntryString(-current) };
    }

    case 'backspace': {
      // The displayed value is a result, not something being typed.
      if (state.overwrite) return state;
      const trimmed = state.entry.slice(0, -1);
      if (trimmed === '' || trimmed === '-') return { ...state, entry: '0', overwrite: true };
      return { ...state, entry: trimmed };
    }

    case 'clearEntry':
      return { ...state, entry: '0', overwrite: true, error: null };

    case 'clearAll':
      return {
        ...state,
        entry: '0',
        accumulator: null,
        pendingOp: null,
        lastOp: null,
        lastOperand: null,
        overwrite: true,
        error: null,
      };

    case 'memoryClear':
      return { ...state, memory: 0 };

    case 'memoryRecall':
      return { ...state, entry: toEntryString(state.memory), overwrite: true };

    case 'memoryAdd':
      return { ...state, memory: state.memory + toNumber(state.entry), overwrite: true };

    case 'memorySubtract':
      return { ...state, memory: state.memory - toNumber(state.entry), overwrite: true };

    case 'clearTape':
      return { ...state, tape: [] };

    case 'recallTape': {
      // Keeps any pending operation, so `12 +` then a tape click then `=` works.
      const value = Number.parseFloat(action.value.replace(/,/g, ''));
      if (!Number.isFinite(value)) return state;
      return { ...state, entry: toEntryString(value), overwrite: true, error: null };
    }

    case 'hydrate':
      return {
        ...state,
        memory: Number.isFinite(action.memory) ? action.memory : 0,
        tape: action.tape.slice(0, MAX_TAPE_ENTRIES),
      };
  }
}
