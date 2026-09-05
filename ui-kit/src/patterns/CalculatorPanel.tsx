import { useEffect, useReducer, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { cn } from '../utils/cn';
import { Button } from '../forms/Button';
import { Box } from '../layout/Box';
import { Inline } from '../layout/Stack';
import { Text } from '../layout/Text';
import { FloatingPanel, type FloatingPanelPosition } from '../overlay/FloatingPanel';
import {
  calculatorReducer,
  createCalculatorState,
  formatDisplay,
  formatPending,
  formatNumber,
  type CalculatorAction,
  type CalculatorOp,
  type TapeEntry,
} from './calculatorEngine';
import styles from './CalculatorPanel.module.css';

export const CALCULATOR_KEYBOARD_SCOPE = 'calculator';

export interface CalculatorPanelProps {
  open: boolean;
  onClose: () => void;
  position?: FloatingPanelPosition | null;
  onPositionChange?: (next: FloatingPanelPosition) => void;
  initialMemory?: number;
  initialTape?: TapeEntry[];
  /** Fired after every committed change; the host debounces before persisting. */
  onStateChange?: (snapshot: { memory: number; tape: TapeEntry[] }) => void;
}

type KeyDef = {
  label: string;
  /** Spoken name — the glyphs read badly aloud. */
  aria?: string;
  action: CalculatorAction;
  /** In-app actions only, so `brand` never appears here. */
  variant?: 'solid' | 'outline' | 'ghost' | 'danger';
  compact?: boolean;
};

const OPERATOR: Record<string, CalculatorOp> = {
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  x: '*',
  X: '*',
};

const KEYS: KeyDef[] = [
  { label: 'MC', aria: 'Memory clear', action: { type: 'memoryClear' }, compact: true },
  { label: 'MR', aria: 'Memory recall', action: { type: 'memoryRecall' }, compact: true },
  { label: 'M+', aria: 'Memory add', action: { type: 'memoryAdd' }, compact: true },
  { label: 'M−', aria: 'Memory subtract', action: { type: 'memorySubtract' }, compact: true },

  {
    label: 'AC',
    aria: 'Clear all',
    action: { type: 'clearAll' },
    variant: 'danger',
    compact: true,
  },
  { label: 'CE', aria: 'Clear entry', action: { type: 'clearEntry' }, compact: true },
  { label: '%', aria: 'Percent', action: { type: 'percent' }, compact: true },
  { label: '÷', aria: 'Divide', action: { type: 'operator', op: '/' }, variant: 'outline' },

  { label: '7', action: { type: 'digit', digit: '7' } },
  { label: '8', action: { type: 'digit', digit: '8' } },
  { label: '9', action: { type: 'digit', digit: '9' } },
  { label: '×', aria: 'Multiply', action: { type: 'operator', op: '*' }, variant: 'outline' },

  { label: '4', action: { type: 'digit', digit: '4' } },
  { label: '5', action: { type: 'digit', digit: '5' } },
  { label: '6', action: { type: 'digit', digit: '6' } },
  { label: '−', aria: 'Subtract', action: { type: 'operator', op: '-' }, variant: 'outline' },

  { label: '1', action: { type: 'digit', digit: '1' } },
  { label: '2', action: { type: 'digit', digit: '2' } },
  { label: '3', action: { type: 'digit', digit: '3' } },
  { label: '+', aria: 'Add', action: { type: 'operator', op: '+' }, variant: 'outline' },

  { label: '±', aria: 'Toggle sign', action: { type: 'negate' }, compact: true },
  { label: '0', action: { type: 'digit', digit: '0' } },
  { label: '.', aria: 'Decimal point', action: { type: 'decimal' } },
  { label: '=', aria: 'Equals', action: { type: 'equals' }, variant: 'solid' },
];

export function CalculatorPanel({
  open,
  onClose,
  position = null,
  onPositionChange,
  initialMemory = 0,
  initialTape,
  onStateChange,
}: CalculatorPanelProps) {
  const [state, dispatch] = useReducer(
    calculatorReducer,
    { memory: initialMemory, tape: initialTape },
    createCalculatorState,
  );
  const displayRef = useRef<HTMLElement>(null);
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    onStateChangeRef.current?.({ memory: state.memory, tape: state.tape });
  }, [state.memory, state.tape]);

  /**
   * Bound to the panel, never to `document`: digits reach the calculator only when
   * focus is already inside it, so typing in a page form is never hijacked.
   */
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const { key, code } = event;
    let action: CalculatorAction | null = null;

    if (/^[0-9]$/.test(key)) action = { type: 'digit', digit: key };
    else if (key === '.' || key === ',' || code === 'NumpadDecimal') action = { type: 'decimal' };
    else if (OPERATOR[key]) action = { type: 'operator', op: OPERATOR[key] };
    else if (key === 'Enter' || key === '=') action = { type: 'equals' };
    else if (key === '%') action = { type: 'percent' };
    else if (key === 'Backspace') action = { type: 'backspace' };
    else if (key === 'Delete') action = { type: 'clearEntry' };

    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    dispatch(action);
  };

  return (
    <FloatingPanel
      open={open}
      title="Calculator"
      onClose={onClose}
      position={position}
      onPositionChange={onPositionChange}
      keyboardScope={CALCULATOR_KEYBOARD_SCOPE}
      initialFocusRef={displayRef}
      width={288}
    >
      {/* The whole body is the key surface: keys are handled here, never on document. */}
      <Box onKeyDown={onKeyDown}>
        <Box
          ref={displayRef}
          tabIndex={-1}
          px="md"
          py="sm"
          bg="muted"
          borderBottom
          textAlign="right"
        >
          <Text variant="micro" color="muted" className={styles.pending} aria-hidden>
            {formatPending(state) || ' '}
          </Text>
          <Box
            role="status"
            aria-live="polite"
            aria-atomic
            className={cn(styles.value, state.error && styles.valueError)}
          >
            {state.error ?? formatDisplay(state)}
          </Box>
          <Box className={styles.flags}>
            {state.memory !== 0 ? (
              <Text variant="overline" weight="bold" className={styles.memoryFlag}>
                M {formatNumber(state.memory)}
              </Text>
            ) : null}
          </Box>
        </Box>

        <Box display="grid" gap="xs" padding="sm" className={styles.keypad}>
          {KEYS.map((key) => (
            <Button
              key={key.label}
              size="sm"
              variant={key.variant ?? 'ghost'}
              aria-label={key.aria}
              className={cn(styles.key, key.compact && styles.keyCompact)}
              onClick={() => dispatch(key.action)}
            >
              {key.label}
            </Button>
          ))}
        </Box>

        <Box borderTop bg="surface">
          <Inline justify="between" gap="sm" pl="md" pr="sm" py="xs">
            <Text variant="overline" color="muted" weight="bold">
              Tape
            </Text>
            {state.tape.length > 0 ? (
              <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'clearTape' })}>
                Clear
              </Button>
            ) : null}
          </Inline>
          {state.tape.length === 0 ? (
            <Box px="md" pb="md" pt="xs">
              <Text variant="micro" color="muted" as="p">
                Results land here and stay after a reload. Tap one to reuse it.
              </Text>
            </Box>
          ) : (
            <Box as="ul" px="sm" pb="sm" overflowY="auto" className={styles.tapeList}>
              {state.tape.map((row) => (
                <Box as="li" key={row.id}>
                  <Button
                    size="sm"
                    variant="ghost"
                    fullWidth
                    className={styles.tapeRow}
                    title={`Use ${row.result}`}
                    onClick={() => dispatch({ type: 'recallTape', value: row.result })}
                  >
                    <Text variant="overline" color="muted" className={styles.tapeExpression}>
                      {row.expression}
                    </Text>
                    <Text variant="caption" weight="semibold" className={styles.tapeResult}>
                      {row.result}
                    </Text>
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </FloatingPanel>
  );
}
