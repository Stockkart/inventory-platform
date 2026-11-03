import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { Icon } from '../icons';
import { IconButton } from '../forms/IconButton';
import {
  MONTH_NAMES,
  addMonths,
  compareIsoText,
  formatYearMonth,
  parseYearMonth,
  type YearMonth,
} from './calendarDate';
import styles from './MonthPicker.module.css';

export interface MonthPickerProps {
  /** Selected month as 'YYYY-MM'. */
  value: string;
  onChange: (value: string) => void;
  /** Earliest month that can be chosen ('YYYY-MM'). */
  min?: string;
  /** Latest month that can be chosen ('YYYY-MM'). */
  max?: string;
  /** Accessible name of the control, e.g. "Pay month". Defaults to "Month". */
  label?: string;
  disabled?: boolean;
  className?: string;
}

/** Months per row in the popover grid; arrow up/down move by this many. */
const GRID_COLUMNS = 3;

function monthText(ym: YearMonth) {
  return `${MONTH_NAMES[ym.month - 1]} ${ym.year}`;
}

/**
 * Month chooser: previous / next buttons around a button that opens a grid of the 12 months
 * of a year. Arrow keys move between months, Page Up / Page Down change the year, Enter picks,
 * Escape closes and returns focus to the button.
 */
export function MonthPicker({
  value,
  onChange,
  min,
  max,
  label = 'Month',
  disabled = false,
  className,
}: MonthPickerProps) {
  // Fall back to the current month if the value is malformed so the control still renders.
  const selected = parseYearMonth(value) ?? {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  };
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selected.year);
  // Index (0..11) of the month button that holds keyboard focus inside the grid (roving tabindex).
  const [focusIndex, setFocusIndex] = useState(selected.month - 1);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const monthRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const panelId = useId();
  const headingId = useId();

  const isOutOfRange = useCallback(
    (ym: YearMonth) => {
      const text = formatYearMonth(ym);
      return (
        (min !== undefined && compareIsoText(text, min) < 0) ||
        (max !== undefined && compareIsoText(text, max) > 0)
      );
    },
    [min, max],
  );

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const openPanel = () => {
    setViewYear(selected.year);
    setFocusIndex(selected.month - 1);
    setOpen(true);
  };

  // Outside click closes without stealing focus; Escape closes and returns focus to the trigger.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(true);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  // Move DOM focus whenever the roving index or the shown year changes while open.
  useEffect(() => {
    if (open) monthRefs.current[focusIndex]?.focus();
  }, [open, focusIndex, viewYear]);

  const step = (delta: number) => {
    const next = addMonths(selected, delta);
    if (!isOutOfRange(next)) onChange(formatYearMonth(next));
  };

  const pick = (monthIndex: number) => {
    const ym = { year: viewYear, month: monthIndex + 1 };
    if (isOutOfRange(ym)) return;
    onChange(formatYearMonth(ym));
    close(true);
  };

  const onGridKeyDown = (e: ReactKeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -GRID_COLUMNS,
      ArrowDown: GRID_COLUMNS,
    };
    if (e.key in moves) {
      e.preventDefault();
      // Moving past January / December rolls into the neighbouring year.
      const target = addMonths({ year: viewYear, month: focusIndex + 1 }, moves[e.key]);
      setViewYear(target.year);
      setFocusIndex(target.month - 1);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setFocusIndex(e.key === 'Home' ? 0 : 11);
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      setViewYear((y) => y + (e.key === 'PageUp' ? -1 : 1));
    }
  };

  const prevDisabled = disabled || isOutOfRange(addMonths(selected, -1));
  const nextDisabled = disabled || isOutOfRange(addMonths(selected, 1));
  // A neighbouring year is only offered when at least one of its months is in range.
  const prevYearDisabled = min !== undefined && compareIsoText(`${viewYear - 1}-12`, min) < 0;
  const nextYearDisabled = max !== undefined && compareIsoText(`${viewYear + 1}-01`, max) > 0;

  return (
    <div ref={rootRef} className={cn(styles.root, className)} role="group" aria-label={label}>
      <IconButton label="Previous month" size="sm" disabled={prevDisabled} onClick={() => step(-1)}>
        <Icon icon={ChevronLeft} size="sm" />
      </IconButton>
      <button
        ref={triggerRef}
        type="button"
        className={cn(styles.trigger, open && styles.triggerOpen)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`${label}: ${monthText(selected)}. Choose a month`}
        disabled={disabled}
        onClick={() => (open ? close(false) : openPanel())}
      >
        <Icon icon={CalendarDays} size="sm" />
        <span>{monthText(selected)}</span>
      </button>
      <IconButton label="Next month" size="sm" disabled={nextDisabled} onClick={() => step(1)}>
        <Icon icon={ChevronRight} size="sm" />
      </IconButton>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={headingId}
          className={styles.panel}
          onKeyDown={onGridKeyDown}
        >
          <div className={styles.panelHead}>
            <IconButton
              label="Previous year"
              size="sm"
              disabled={prevYearDisabled}
              onClick={() => setViewYear((y) => y - 1)}
            >
              <Icon icon={ChevronLeft} size="sm" />
            </IconButton>
            <span id={headingId} className={styles.panelYear} aria-live="polite">
              {viewYear}
            </span>
            <IconButton
              label="Next year"
              size="sm"
              disabled={nextYearDisabled}
              onClick={() => setViewYear((y) => y + 1)}
            >
              <Icon icon={ChevronRight} size="sm" />
            </IconButton>
          </div>
          <div className={styles.grid}>
            {MONTH_NAMES.map((name, index) => {
              const ym = { year: viewYear, month: index + 1 };
              const isSelected = ym.year === selected.year && ym.month === selected.month;
              return (
                <button
                  key={name}
                  ref={(el) => {
                    monthRefs.current[index] = el;
                  }}
                  type="button"
                  className={cn(styles.month, isSelected && styles.monthSelected)}
                  // Only one month is in the Tab order; arrows move between the rest.
                  tabIndex={index === focusIndex ? 0 : -1}
                  aria-pressed={isSelected}
                  aria-label={`${name} ${viewYear}`}
                  disabled={isOutOfRange(ym)}
                  onFocus={() => setFocusIndex(index)}
                  onClick={() => pick(index)}
                >
                  {name.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
