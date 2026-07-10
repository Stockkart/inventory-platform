import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { Search } from 'lucide-react';
import { Box, Input, Modal, Text } from '@inventory-platform/ui-kit';
import type { DashboardNavRow } from '@inventory-platform/routing';
import { DASHBOARD_HOTKEY, getQuickNavFooterHints } from './dashboardHotkeys';
import { KEYBOARD_NAV_SKIP } from './formKeyboardNav';
import styles from './CommandPalette.module.css';
import { NavIcon } from './NavIcon';

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  navRows: DashboardNavRow[];
  modLabel: string;
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export function CommandPalette({ open, onClose, navRows, modLabel }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const filteredRef = useRef<DashboardNavRow[]>([]);
  const activeRef = useRef(0);

  const footerHints = useMemo(() => getQuickNavFooterHints(modLabel), [modLabel]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return navRows;
    return navRows.filter(
      (row) =>
        normalize(row.label).includes(q) ||
        normalize(row.path).includes(q) ||
        normalize(row.groupLabel).includes(q),
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
      requestAnimationFrame(() => {
        document.getElementById('command-palette-input')?.focus();
      });
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
    [navigate, onClose],
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
    [go],
  );

  const onPaletteKeyDownCapture = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>) => {
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
        }
      }
    },
    [go, moveActive, onClose, openQuickIndex],
  );

  if (!open) return null;

  itemRefs.current = [];

  return (
    <Modal open={open} onClose={onClose} size="md" className={styles.paletteModal}>
      <Box
        {...{ 'data-keyboard-nav': KEYBOARD_NAV_SKIP }}
        onKeyDownCapture={onPaletteKeyDownCapture}
        className={styles.palette}
      >
        <Box className={styles.searchRow}>
          <Search className={styles.searchIcon} size={20} aria-hidden />
          <Input
            id="command-palette-input"
            type="search"
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
          <Text as="span" className={styles.hint}>
            Esc
          </Text>
        </Box>
        <Box className={styles.list} role="listbox">
          {filtered.length === 0 ? (
            <Text className={styles.empty}>No pages match your search.</Text>
          ) : (
            filtered.map((row, idx) => (
              <Box
                key={`${row.path}-${idx}`}
                as="button"
                role="option"
                aria-selected={idx === active}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                className={`${styles.item} ${idx === active ? styles.itemActive : ''}`}
                onMouseEnter={() => {
                  setActive(idx);
                  activeRef.current = idx;
                }}
                onClick={() => go(row.path)}
              >
                <Text as="span" className={styles.itemIndex} aria-hidden>
                  {idx < 9 ? String(idx + 1) : ''}
                </Text>
                <Text as="span" className={styles.itemIcon} aria-hidden>
                  <NavIcon name={row.icon} size="sm" />
                </Text>
                <Box className={styles.itemBody}>
                  <Text className={styles.itemLabel}>{row.label}</Text>
                  <Text className={styles.itemMeta}>{row.groupLabel}</Text>
                </Box>
              </Box>
            ))
          )}
        </Box>
        <Box className={styles.footer}>
          {footerHints.map((hint) => (
            <Text key={hint.description} as="span" className={styles.footerHint}>
              {hint.keys.map((k, i) => (
                <Text key={`${hint.description}-${k}-${i}`} as="span">
                  {i > 0 ? (
                    <Text as="span" className={styles.footerPlus}>
                      +
                    </Text>
                  ) : null}
                  <Text as="kbd">{k}</Text>
                </Text>
              ))}{' '}
              <Text as="span" className={styles.footerDesc}>
                {hint.description}
              </Text>
            </Text>
          ))}
        </Box>
      </Box>
    </Modal>
  );
}
