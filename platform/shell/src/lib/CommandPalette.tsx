import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { Search } from 'lucide-react';
import { Box, Input, Modal, Text } from '@inventory-platform/ui-kit';
import type { DashboardNavRow } from '@inventory-platform/routing';
import { DASHBOARD_HOTKEY, getQuickNavFooterHints } from './dashboardHotkeys';
import { KEYBOARD_NAV_SKIP } from './formKeyboardNav';
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

const searchRowStyle = {
  borderBottom: '1px solid var(--sk-color-border-default)',
  background: 'var(--sk-color-bg-canvas)',
} as const;

const inputStyle = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  background: 'transparent',
  boxShadow: 'none',
  paddingLeft: 0,
  paddingRight: 0,
} as const;

const escHintStyle = {
  flexShrink: 0,
  padding: '0.2rem 0.45rem',
  border: '1px solid var(--sk-color-border-default)',
  borderRadius: 4,
  background: 'var(--sk-color-bg-surface)',
} as const;

const footerStyle = {
  borderTop: '1px solid var(--sk-color-border-default)',
  background: 'var(--sk-color-bg-muted, var(--sk-color-bg-canvas))',
  fontSize: '0.75rem',
} as const;

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
    <Modal open={open} onClose={onClose} size="md">
      <Box
        {...{ 'data-keyboard-nav': KEYBOARD_NAV_SKIP }}
        onKeyDownCapture={onPaletteKeyDownCapture}
        display="flex"
        flexDirection="column"
        overflow="hidden"
        style={{ maxHeight: 'min(70vh, 560px)' }}
      >
        <Box display="flex" align="center" gap="sm" padding="md" style={searchRowStyle}>
          <Search
            size={20}
            aria-hidden
            style={{ flexShrink: 0, color: 'var(--sk-color-text-secondary)', opacity: 0.85 }}
          />
          <Input
            id="command-palette-input"
            type="search"
            inputMode="search"
            enterKeyHint="go"
            style={inputStyle}
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
          <Text as="span" variant="caption" weight="semibold" style={escHintStyle}>
            Esc
          </Text>
        </Box>
        <Box
          role="listbox"
          overflow="auto"
          style={{ maxHeight: 'min(52vh, 360px)', padding: '0.35rem 0' }}
        >
          {filtered.length === 0 ? (
            <Text color="secondary" align="center" style={{ padding: '1.5rem 1rem' }}>
              No pages match your search.
            </Text>
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
                display="flex"
                align="center"
                gap="sm"
                width="full"
                onMouseEnter={() => {
                  setActive(idx);
                  activeRef.current = idx;
                }}
                onClick={() => go(row.path)}
                style={{
                  padding: '0.6rem 1rem',
                  border: 'none',
                  background: idx === active ? 'var(--sk-color-hover)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  font: 'inherit',
                  color: 'var(--sk-color-text-primary)',
                }}
              >
                <Text
                  as="span"
                  variant="caption"
                  weight="semibold"
                  color={idx === active ? 'primary' : 'secondary'}
                  aria-hidden
                  style={{ flexShrink: 0, width: '1.5rem', textAlign: 'center' }}
                >
                  {idx < 9 ? String(idx + 1) : ''}
                </Text>
                <Text
                  as="span"
                  aria-hidden
                  style={{ flexShrink: 0, fontSize: '1.1rem', lineHeight: 1 }}
                >
                  <NavIcon name={row.icon} size="sm" />
                </Text>
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text weight="medium">{row.label}</Text>
                  <Text color="secondary" variant="caption" style={{ marginTop: '0.15rem' }}>
                    {row.groupLabel}
                  </Text>
                </Box>
              </Box>
            ))
          )}
        </Box>
        <Box display="flex" flexWrap gap="sm" padding="sm" style={footerStyle}>
          {footerHints.map((hint) => (
            <Text
              key={hint.description}
              as="span"
              color="secondary"
              style={{
                display: 'inline-flex',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                gap: '0.15rem',
              }}
            >
              {hint.keys.map((k, i) => (
                <Text key={`${hint.description}-${k}-${i}`} as="span">
                  {i > 0 ? (
                    <Text
                      as="span"
                      color="muted"
                      style={{ margin: '0 0.1rem', fontSize: '0.65rem', fontWeight: 600 }}
                    >
                      +
                    </Text>
                  ) : null}
                  <Text as="kbd">{k}</Text>
                </Text>
              ))}{' '}
              <Text as="span" color="secondary" style={{ marginLeft: '0.25rem' }}>
                {hint.description}
              </Text>
            </Text>
          ))}
        </Box>
      </Box>
    </Modal>
  );
}
