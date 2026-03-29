import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { Search } from 'lucide-react';
import type { DashboardNavRow } from './dashboardNavConfig';
import {
  DASHBOARD_HOTKEY,
  getQuickNavFooterHints,
} from './dashboardHotkeys';
import { KEYBOARD_NAV_SKIP } from './formKeyboardNav';
import styles from './CommandPalette.module.css';

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  navRows: DashboardNavRow[];
  modLabel: string;
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export function CommandPalette({
  open,
  onClose,
  navRows,
  modLabel,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filteredRef = useRef<DashboardNavRow[]>([]);
  const activeRef = useRef(0);

  const footerHints = useMemo(
    () => getQuickNavFooterHints(modLabel),
    [modLabel]
  );

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return navRows;
    return navRows.filter(
      (row) =>
        normalize(row.label).includes(q) ||
        normalize(row.path).includes(q) ||
        normalize(row.groupLabel).includes(q)
    );
  }, [navRows, query]);

  filteredRef.current = filtered;

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      activeRef.current = 0;
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActive((i) => {
      const len = filteredRef.current.length;
      if (len === 0) {
        activeRef.current = 0;
        return 0;
      }
      const next = Math.min(i, len - 1);
      activeRef.current = next;
      return next;
    });
  }, [open, filtered.length]);

  useEffect(() => {
    if (!open || filtered.length === 0) return;
    const el = itemRefs.current[active];
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [active, open, filtered.length]);

  const go = useCallback(
    (path: string) => {
      navigate(path);
      onClose();
    },
    [navigate, onClose]
  );

  const moveActive = useCallback((delta: number) => {
    setActive((i) => {
      const len = filteredRef.current.length;
      if (len === 0) {
        activeRef.current = 0;
        return 0;
      }
      const next = (i + delta + len) % len;
      activeRef.current = next;
      return next;
    });
  }, []);

  const openQuickIndex = useCallback(
    (oneBased: number) => {
      const list = filteredRef.current;
      const idx = oneBased - 1;
      if (idx >= 0 && idx < list.length) {
        go(list[idx].path);
      }
    },
    [go]
  );

  const onPaletteKeyDownCapture = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      const key = e.key;
      const len = filteredRef.current.length;

      if (key === DASHBOARD_HOTKEY.closeOverlay) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        moveActive(1);
        return;
      }

      if (key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        moveActive(-1);
        return;
      }

      if (key === 'Enter' && len > 0) {
        const row = filteredRef.current[activeRef.current];
        if (row) {
          e.preventDefault();
          e.stopPropagation();
          go(row.path);
        }
        return;
      }

      if (e.altKey && len > 0) {
        const digit = /^Digit([1-9])$/.exec(e.code);
        if (digit) {
          e.preventDefault();
          e.stopPropagation();
          openQuickIndex(Number(digit[1]));
          return;
        }
      }
    },
    [go, moveActive, onClose, openQuickIndex]
  );

  if (!open) return null;

  itemRefs.current = [];

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Go to page"
      {...{ 'data-keyboard-nav': KEYBOARD_NAV_SKIP }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.dialog}
        onKeyDownCapture={onPaletteKeyDownCapture}
      >
        <div className={styles.searchRow}>
          <Search className={styles.searchIcon} size={20} aria-hidden />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="go"
            className={styles.input}
            placeholder="Search pages…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              activeRef.current = 0;
            }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <span className={styles.hint}>Esc</span>
        </div>
        <div className={styles.list} role="listbox">
          {filtered.length === 0 ? (
            <div className={styles.empty}>No pages match your search.</div>
          ) : (
            filtered.map((row, idx) => (
              <button
                key={`${row.path}-${idx}`}
                type="button"
                role="option"
                aria-selected={idx === active}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                className={`${styles.item} ${
                  idx === active ? styles.itemActive : ''
                }`}
                onMouseEnter={() => {
                  setActive(idx);
                  activeRef.current = idx;
                }}
                onClick={() => go(row.path)}
              >
                <span className={styles.itemIndex} aria-hidden>
                  {idx < 9 ? String(idx + 1) : ''}
                </span>
                <span className={styles.itemIcon} aria-hidden>
                  {row.icon}
                </span>
                <span className={styles.itemBody}>
                  <div className={styles.itemLabel}>{row.label}</div>
                  <div className={styles.itemMeta}>{row.groupLabel}</div>
                </span>
              </button>
            ))
          )}
        </div>
        <div className={styles.footer}>
          {footerHints.map((hint) => (
            <span key={hint.description} className={styles.footerHint}>
              {hint.keys.map((k, i) => (
                <span key={`${hint.description}-${k}-${i}`}>
                  {i > 0 ? (
                    <span className={styles.footerPlus}>+</span>
                  ) : null}
                  <kbd>{k}</kbd>
                </span>
              ))}{' '}
              <span className={styles.footerDesc}>{hint.description}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
