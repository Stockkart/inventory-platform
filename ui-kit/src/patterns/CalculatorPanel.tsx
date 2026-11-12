import { type KeyboardEvent as ReactKeyboardEvent, useRef } from 'react';
import { cn } from '../utils/cn';
import { Button } from '../forms/Button';
import { Box } from '../layout/Box';
import { Inline } from '../layout/Stack';
import { Text } from '../layout/Text';
import { FloatingPanel, type FloatingPanelPosition } from '../overlay/FloatingPanel';
import styles from './CalculatorPanel.module.css';

export const CALCULATOR_KEYBOARD_SCOPE = 'calculator';

type CalculatorDigit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

/** Every key the panel can emit. What a key does is the host's business. */
export type CalculatorKey =
  | CalculatorDigit
  | '.'
  | '+'
  | '-'
  | '*'
  | '/'
  | '='
  | '%'
  | '±'
  | 'backspace'
  | 'CE'
  | 'AC'
  | 'MC'
  | 'MR'
  | 'M+'
  | 'M-';

export interface CalculatorTapeRow {
  id: string;
  expression: string;
  result: string;
}

export interface CalculatorPanelProps {
  open: boolean;
  onClose: () => void;
  position?: FloatingPanelPosition | null;
  onPositionChange?: (next: FloatingPanelPosition) => void;
  /** False when the panel is restored on page load, so it does not take focus from the page. */
  autoFocus?: boolean;
  /** The readout, already formatted by the host. */
  display: string;
  /** Shown in the danger colour when the readout is an error message. */
  error?: boolean;
  /** The pending step above the readout, e.g. "1,200 ×". */
  pending?: string;
  /** Memory register, formatted; omit or null to hide the M flag. */
  memory?: string | null;
  tape: CalculatorTapeRow[];
  onKey: (key: CalculatorKey) => void;
  onRecallTape: (row: CalculatorTapeRow) => void;
  onClearTape: () => void;
}

interface KeyDef {
  key: CalculatorKey;
  label: string;
  /** Spoken name — the glyphs read badly aloud. */
  aria?: string;
  /** In-app actions only, so `brand` never appears here. */
  variant?: 'solid' | 'outline' | 'ghost' | 'danger';
  compact?: boolean;
}

const KEYS: KeyDef[] = [
  { key: 'MC', label: 'MC', aria: 'Memory clear', compact: true },
  { key: 'MR', label: 'MR', aria: 'Memory recall', compact: true },
  { key: 'M+', label: 'M+', aria: 'Memory add', compact: true },
  { key: 'M-', label: 'M−', aria: 'Memory subtract', compact: true },

  { key: 'AC', label: 'AC', aria: 'Clear all', variant: 'danger', compact: true },
  { key: 'CE', label: 'CE', aria: 'Clear entry', compact: true },
  { key: '%', label: '%', aria: 'Percent', compact: true },
  { key: '/', label: '÷', aria: 'Divide', variant: 'outline' },

  { key: '7', label: '7' },
  { key: '8', label: '8' },
  { key: '9', label: '9' },
  { key: '*', label: '×', aria: 'Multiply', variant: 'outline' },

  { key: '4', label: '4' },
  { key: '5', label: '5' },
  { key: '6', label: '6' },
  { key: '-', label: '−', aria: 'Subtract', variant: 'outline' },

  { key: '1', label: '1' },
  { key: '2', label: '2' },
  { key: '3', label: '3' },
  { key: '+', label: '+', aria: 'Add', variant: 'outline' },

  { key: '±', label: '±', aria: 'Toggle sign', compact: true },
  { key: '0', label: '0' },
  { key: '.', label: '.', aria: 'Decimal point' },
  { key: '=', label: '=', aria: 'Equals', variant: 'solid' },
];

const TYPED_OPERATOR: Record<string, CalculatorKey> = {
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  x: '*',
  X: '*',
};

/** Physical keyboard to panel key. `AC` is button-only: no key wipes the accumulator. */
function keyFromEvent(event: ReactKeyboardEvent<HTMLElement>): CalculatorKey | null {
  const { key, code } = event;
  if (/^[0-9]$/.test(key)) return key as CalculatorDigit;
  if (key === '.' || key === ',' || code === 'NumpadDecimal') return '.';
  if (TYPED_OPERATOR[key]) return TYPED_OPERATOR[key];
  if (key === 'Enter' || key === '=') return '=';
  if (key === '%') return '%';
  if (key === 'Backspace') return 'backspace';
  if (key === 'Delete') return 'CE';
  return null;
}

/**
 * Desk calculator in a `FloatingPanel`. Presentation only: the host owns the
 * arithmetic, formatting and persistence, and gets every key press via `onKey`.
 */
export function CalculatorPanel({
  open,
  onClose,
  position = null,
  onPositionChange,
  autoFocus = true,
  display,
  error = false,
  pending = '',
  memory = null,
  tape,
  onKey,
  onRecallTape,
  onClearTape,
}: CalculatorPanelProps) {
  const displayRef = useRef<HTMLElement>(null);

  /**
   * Bound to the panel, never to `document`: digits reach the calculator only when
   * focus is already inside it, so typing in a page form is never hijacked.
   */
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = keyFromEvent(event);
    if (!key) return;
    event.preventDefault();
    event.stopPropagation();
    onKey(key);
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
      autoFocus={autoFocus}
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
            {pending || ' '}
          </Text>
          <Box
            role="status"
            aria-live="polite"
            aria-atomic
            className={cn(styles.value, error && styles.valueError)}
          >
            {display}
          </Box>
          <Box className={styles.flags}>
            {memory !== null ? (
              <Text variant="overline" weight="bold" className={styles.memoryFlag}>
                M {memory}
              </Text>
            ) : null}
          </Box>
        </Box>

        <Box display="grid" gap="xs" padding="sm" className={styles.keypad}>
          {KEYS.map((def) => (
            <Button
              key={def.key}
              size="sm"
              variant={def.variant ?? 'ghost'}
              aria-label={def.aria}
              className={cn(styles.key, def.compact && styles.keyCompact)}
              onClick={() => onKey(def.key)}
            >
              {def.label}
            </Button>
          ))}
        </Box>

        <Box borderTop bg="surface">
          <Inline justify="between" gap="sm" pl="md" pr="sm" py="xs">
            <Text variant="overline" color="muted" weight="bold">
              Tape
            </Text>
            {tape.length > 0 ? (
              <Button size="sm" variant="ghost" onClick={onClearTape}>
                Clear
              </Button>
            ) : null}
          </Inline>
          {tape.length === 0 ? (
            <Box px="md" pb="md" pt="xs">
              <Text variant="micro" color="muted" as="p">
                Results land here and stay after a reload. Tap one to reuse it.
              </Text>
            </Box>
          ) : (
            <Box
              as="ul"
              aria-label="Calculator tape"
              px="sm"
              pb="sm"
              overflowY="auto"
              className={styles.tapeList}
            >
              {tape.map((row) => (
                <Box as="li" key={row.id}>
                  <Button
                    size="sm"
                    variant="ghost"
                    fullWidth
                    className={styles.tapeRow}
                    title={`Use ${row.result}`}
                    onClick={() => onRecallTape(row)}
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
