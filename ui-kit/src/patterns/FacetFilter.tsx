import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { Icon } from '../icons';
import styles from './FacetFilter.module.css';

/** Classes for a "filters in a strip under the search bar" page. */
export const searchChrome = {
  /** The whole strip row (wraps on small screens). */
  strip: styles.strip,
  /** The filter dropdowns, left-aligned. */
  stripMain: styles.stripMain,
  /** Right-aligned end of the strip (sort). */
  stripEnd: styles.stripEnd,
  /** Scrollable checkbox list inside a dropdown panel. */
  facetListScroll: styles.facetListScroll,
} as const;

export interface FilterStripProps {
  children: ReactNode;
  /** Right-aligned content, e.g. the sort picker. */
  end?: ReactNode;
  className?: string;
  'aria-label'?: string;
}

/** One row of filter dropdowns with an optional right-aligned end (SIM-T style). */
export function FilterStrip({
  children,
  end,
  className,
  'aria-label': ariaLabel,
}: FilterStripProps) {
  return (
    <div className={cn(styles.strip, className)} role="group" aria-label={ariaLabel}>
      <div className={styles.stripMain}>{children}</div>
      {end ? <div className={styles.stripEnd}>{end}</div> : null}
    </div>
  );
}

export interface FilterDropdownProps {
  /** Button text, e.g. "Company". */
  label: string;
  /** What is chosen, shown after the label in a lighter weight: "Company: Cipla, GSK". */
  value?: string;
  /** When given, a ✕ next to the button removes this filter. */
  onRemove?: () => void;
  removeLabel?: string;
  /** Number of active selections, shown in a badge and marking the button active. */
  count?: number;
  children: ReactNode;
  /** Controlled open state (otherwise uncontrolled). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** Wider panel for forms with two inputs side by side. */
  wide?: boolean;
  /** Anchor the panel to the button's right edge (for the last items in a row). */
  alignRight?: boolean;
  /** Optional action in the panel header (e.g. "Clear"). */
  headerAction?: ReactNode;
  /** Panel heading when it should differ from the button text (e.g. button "Sort: …", heading "Sort by"). */
  panelTitle?: string;
  className?: string;
}

/**
 * A pill button that opens a small panel underneath. Closes on outside click or Escape. The
 * panel stays open while values are ticked so several can be chosen in one go.
 */
export function FilterDropdown({
  label,
  value,
  onRemove,
  removeLabel,
  count = 0,
  children,
  open: controlledOpen,
  onOpenChange,
  disabled = false,
  wide = false,
  alignRight = false,
  headerAction,
  panelTitle,
  className,
}: FilterDropdownProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const setOpen = useCallback((next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChangeRef.current?.(next);
  }, []);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, setOpen]);

  return (
    <div
      ref={rootRef}
      className={cn(styles.dropdown, onRemove && styles.dropdownHasRemove, className)}
    >
      <button
        type="button"
        className={cn(
          styles.dropdownButton,
          count > 0 && styles.dropdownButtonActive,
          open && styles.dropdownButtonOpen,
        )}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.dropdownLabel}>
          {label}
          {value ? (
            <span className={styles.dropdownValue}>
              {': '}
              {value}
            </span>
          ) : null}
        </span>
        {count > 0 && !value ? <span className={styles.dropdownCount}>{count}</span> : null}
        <Icon
          icon={ChevronDown}
          size="sm"
          className={cn(styles.dropdownChevron, open && styles.dropdownChevronOpen)}
        />
      </button>
      {onRemove ? (
        <button
          type="button"
          className={styles.dropdownRemove}
          aria-label={removeLabel ?? `Remove ${label} filter`}
          disabled={disabled}
          onClick={onRemove}
        >
          <Icon icon={X} size="sm" />
        </button>
      ) : null}
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={panelTitle ?? label}
          className={cn(
            styles.dropdownPanel,
            wide && styles.dropdownPanelWide,
            alignRight && styles.dropdownPanelRight,
          )}
        >
          <div className={styles.dropdownPanelHead}>
            <span className={styles.dropdownPanelTitle}>{panelTitle ?? label}</span>
            {headerAction}
          </div>
          {children}
        </div>
      ) : null}
    </div>
  );
}

export interface CollapsibleGroupProps {
  title: string;
  /** Number shown in a small badge next to the title (e.g. active selections). Hidden when 0. */
  count?: number;
  defaultOpen?: boolean;
  /** Controlled open state; when given, `onOpenChange` must update it. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

/** A titled, collapsible section for a vertical filter panel, with a chevron and an optional count badge. */
export function CollapsibleGroup({
  title,
  count = 0,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  children,
  className,
}: CollapsibleGroupProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const bodyId = useId();
  const toggle = () => {
    const next = !open;
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  return (
    <section className={cn(styles.group, className)}>
      <button
        type="button"
        className={styles.groupHead}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={toggle}
      >
        <span className={styles.groupHeadMain}>
          <span className={styles.groupTitle}>{title}</span>
          {count > 0 ? <span className={styles.groupCount}>{count}</span> : null}
        </span>
        <Icon
          icon={ChevronDown}
          size="sm"
          className={cn(styles.groupChevron, open && styles.groupChevronOpen)}
        />
      </button>
      {open ? (
        <div id={bodyId} className={styles.groupBody}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

export interface FacetOption {
  value: string;
  label: string;
  /** Omit while counts are unknown (before the first search). */
  count?: number;
}

export interface FacetCheckboxListProps {
  options: readonly FacetOption[];
  selected: readonly string[];
  onToggle: (value: string) => void;
  /** Accessible name for the list. */
  'aria-label': string;
  /** Shown when there are no options. */
  emptyText?: string;
  disabled?: boolean;
  /** Cap the height and scroll (for dropdown panels). */
  scroll?: boolean;
  className?: string;
}

/**
 * Checkbox per value, label on the left and count on the right. Values with a count of zero
 * stay visible but muted, so a filter can be widened as well as narrowed.
 */
export function FacetCheckboxList({
  options,
  selected,
  onToggle,
  'aria-label': ariaLabel,
  emptyText = 'No values',
  disabled = false,
  scroll = false,
  className,
}: FacetCheckboxListProps) {
  if (options.length === 0) {
    return <div className={styles.facetEmpty}>{emptyText}</div>;
  }
  return (
    <ul
      className={cn(styles.facetList, scroll && styles.facetListScroll, className)}
      aria-label={ariaLabel}
    >
      {options.map((o) => {
        const checked = selected.includes(o.value);
        const zero = o.count === 0 && !checked;
        return (
          <li key={o.value}>
            <label className={cn(styles.facetItem, zero && styles.facetItemZero)}>
              <span className={styles.facetItemMain}>
                <input
                  type="checkbox"
                  aria-label={o.label}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggle(o.value)}
                />
                <span className={styles.facetLabel} title={o.label} aria-hidden>
                  {o.label}
                </span>
              </span>
              {o.count !== undefined ? (
                <span className={styles.facetCount} aria-label={`${o.count} results`}>
                  {o.count.toLocaleString()}
                </span>
              ) : null}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export interface ChoiceOption {
  value: string;
  label: string;
  /** Small secondary line under the label. */
  hint?: string;
  /** Options with the same group text are listed under one heading. */
  group?: string;
}

export interface ChoiceListProps {
  options: readonly ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
  'aria-label': string;
  className?: string;
}

/**
 * A single-choice list for a dropdown panel: optional group headings, a check mark on the
 * chosen option, arrow keys to move between options.
 */
export function ChoiceList({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  className,
}: ChoiceListProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const move = (from: HTMLElement, delta: number) => {
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('button[role="option"]') ?? [],
    );
    const i = items.indexOf(from as HTMLButtonElement);
    const next = items[(i + delta + items.length) % items.length];
    next?.focus();
  };
  const rows: ReactNode[] = [];
  let lastGroup: string | undefined;
  options.forEach((o) => {
    if (o.group && o.group !== lastGroup) {
      rows.push(
        <li key={`group-${o.group}`} role="presentation" className={styles.choiceGroup}>
          {o.group}
        </li>,
      );
    }
    lastGroup = o.group;
    const selected = o.value === value;
    rows.push(
      <li key={o.value} role="presentation">
        <button
          type="button"
          role="option"
          aria-selected={selected}
          className={cn(styles.choiceItem, selected && styles.choiceItemSelected)}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              move(e.currentTarget, 1);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              move(e.currentTarget, -1);
            }
          }}
        >
          <span className={styles.choiceItemMain}>
            <span>{o.label}</span>
            {o.hint ? <span className={styles.choiceHint}>{o.hint}</span> : null}
          </span>
          {selected ? <Icon icon={Check} size="sm" className={styles.choiceCheck} /> : null}
        </button>
      </li>,
    );
  });
  return (
    <ul
      ref={listRef}
      role="listbox"
      aria-label={ariaLabel}
      className={cn(styles.choiceList, className)}
    >
      {rows}
    </ul>
  );
}
