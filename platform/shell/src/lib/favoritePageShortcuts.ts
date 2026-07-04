import type { DashboardNavRow } from './dashboardNavConfig';
import { DASHBOARD_HOTKEY } from './dashboardHotkeys';

const STORAGE_KEY = 'dashboardFavoritePageShortcuts';
export const MAX_FAVORITE_PAGE_SHORTCUTS = 24;

const FN_KEYS = new Set([
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
]);

function normalizeFnKey(key: string): string | null {
  const m = /^F(1[0-2]|[1-9])$/i.exec(key.trim());
  if (!m) return null;
  return `F${m[1]}`;
}

export type FavoriteBinding =
  | { kind: 'fn'; fn: string }
  | {
      kind: 'chord';
      /** Cmd/Ctrl */
      mod: boolean;
      alt: boolean;
      shift: boolean;
      /** a-z, 0-9, or F1–F12 */
      key: string;
    };

export type FavoritePageShortcut = {
  id: string;
  path: string;
  label: string;
  binding: FavoriteBinding;
};

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `fs-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function bindingSignature(b: FavoriteBinding): string {
  if (b.kind === 'fn') return `fn:${b.fn}`;
  return `chord:${b.mod ? 1 : 0}:${b.alt ? 1 : 0}:${b.shift ? 1 : 0}:${b.key}`;
}

function parseBindingFromStorage(
  r: Record<string, unknown>
): FavoriteBinding | null {
  const raw = r.binding;
  if (raw && typeof raw === 'object' && raw !== null) {
    const o = raw as Record<string, unknown>;
    if (o.kind === 'fn' && typeof o.fn === 'string') {
      const fn = normalizeFnKey(o.fn);
      if (fn && FN_KEYS.has(fn)) return { kind: 'fn', fn };
      return null;
    }
    if (o.kind === 'chord') {
      const mod = Boolean(o.mod);
      const alt = Boolean(o.alt);
      const shift = Boolean(o.shift);
      const key = typeof o.key === 'string' ? o.key : '';
      if (!mod && !alt && !shift) return null;
      const lower = key.toLowerCase();
      if (/^[a-z0-9]$/.test(lower)) {
        return { kind: 'chord', mod, alt, shift, key: lower };
      }
      const fk = normalizeFnKey(key);
      if (fk && FN_KEYS.has(fk)) {
        return { kind: 'chord', mod, alt, shift, key: fk };
      }
      return null;
    }
  }
  /* Legacy: single letter = ⌘/Ctrl + Shift + key */
  const legacyKey = typeof r.key === 'string' ? r.key : '';
  if (/^[a-z0-9]$/i.test(legacyKey)) {
    return {
      kind: 'chord',
      mod: true,
      alt: false,
      shift: true,
      key: legacyKey.toLowerCase(),
    };
  }
  return null;
}

export function loadFavoritePageShortcuts(): FavoritePageShortcut[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: FavoritePageShortcut[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const id = typeof r.id === 'string' ? r.id : newId();
      const path = typeof r.path === 'string' ? r.path : '';
      const label = typeof r.label === 'string' ? r.label : path;
      const binding = parseBindingFromStorage(r);
      if (!path || !binding) continue;
      out.push({ id, path, label, binding });
    }
    return out.slice(0, MAX_FAVORITE_PAGE_SHORTCUTS);
  } catch {
    return [];
  }
}

export function saveFavoritePageShortcuts(items: FavoritePageShortcut[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_FAVORITE_PAGE_SHORTCUTS))
    );
  } catch {
    /* ignore quota */
  }
}

export function refreshFavoriteLabels(
  items: FavoritePageShortcut[],
  navRows: DashboardNavRow[]
): FavoritePageShortcut[] {
  const byPath = new Map(navRows.map((r) => [r.path, r.label]));
  return items.map((item) => ({
    ...item,
    label: byPath.get(item.path) ?? item.label,
  }));
}

export function formatFavoriteShortcutDisplay(
  s: FavoritePageShortcut,
  modLabel: string
): string[][] {
  const b = s.binding;
  if (b.kind === 'fn') {
    return [[b.fn]];
  }
  const parts: string[] = [];
  if (b.mod) parts.push(modLabel);
  if (b.alt) parts.push('Alt');
  if (b.shift) parts.push('Shift');
  parts.push(b.key.toUpperCase());
  return [parts];
}

/** Reserved: ⌘/Ctrl + K / B without Alt (matches app chrome shortcuts). */
export function bindingConflictsWithBuiltIns(b: FavoriteBinding): boolean {
  if (b.kind === 'fn') return false;
  if (b.alt || b.shift) return false;
  if (!b.mod) return false;
  const k = b.key.toLowerCase();
  if (!/^[a-z]$/.test(k)) return false;
  if (k === DASHBOARD_HOTKEY.quickNavToggleModKey) return true;
  if (k === DASHBOARD_HOTKEY.toggleSidebarModKey) return true;
  return false;
}

export function parseRecordedFavoriteBinding(
  e: KeyboardEvent
): FavoriteBinding | null {
  if (e.repeat) return null;

  const mod = e.metaKey || e.ctrlKey;
  const alt = e.altKey;
  const shift = e.shiftKey;

  if (
    e.key === 'Control' ||
    e.key === 'Meta' ||
    e.key === 'Shift' ||
    e.key === 'Alt'
  ) {
    return null;
  }

  const fnNorm = normalizeFnKey(e.key);
  if (fnNorm && FN_KEYS.has(fnNorm)) {
    if (!mod && !alt && !shift) {
      return { kind: 'fn', fn: fnNorm };
    }
    return { kind: 'chord', mod, alt, shift, key: fnNorm };
  }

  if (e.key.length !== 1 || !/^[a-zA-Z0-9]$/.test(e.key)) return null;
  if (!mod && !alt && !shift) return null;

  return {
    kind: 'chord',
    mod,
    alt,
    shift,
    key: e.key.toLowerCase(),
  };
}

export function favoriteShortcutMatches(
  e: KeyboardEvent,
  s: FavoritePageShortcut
): boolean {
  if (e.repeat) return false;
  const b = s.binding;

  if (b.kind === 'fn') {
    const fnNorm = normalizeFnKey(e.key);
    return (
      fnNorm === b.fn &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.shiftKey
    );
  }

  const mod = e.metaKey || e.ctrlKey;
  if (b.mod !== mod) return false;
  if (b.alt !== e.altKey) return false;
  if (b.shift !== e.shiftKey) return false;

  if (/^F(1[0-2]|[1-9])$/i.test(b.key)) {
    const fnNorm = normalizeFnKey(e.key);
    return fnNorm === b.key;
  }

  if (e.key.length !== 1) return false;
  return e.key.toLowerCase() === b.key.toLowerCase();
}

export function findDuplicateBinding(
  items: FavoritePageShortcut[],
  binding: FavoriteBinding,
  exceptId?: string
): boolean {
  const sig = bindingSignature(binding);
  return items.some(
    (i) => bindingSignature(i.binding) === sig && i.id !== exceptId
  );
}

export function addOrUpdateFavoritePageShortcut(
  items: FavoritePageShortcut[],
  path: string,
  label: string,
  binding: FavoriteBinding
):
  | { ok: true; next: FavoritePageShortcut[] }
  | { ok: false; message: string } {
  if (bindingConflictsWithBuiltIns(binding)) {
    return {
      ok: false,
      message:
        'That shortcut is reserved for quick navigation or the sidebar. Try adding Shift or Alt, or pick another key.',
    };
  }
  const existing = items.find((i) => i.path === path);
  if (findDuplicateBinding(items, binding, existing?.id)) {
    return {
      ok: false,
      message: 'That shortcut is already used for another page.',
    };
  }
  if (existing) {
    return {
      ok: true,
      next: items.map((i) =>
        i.path === path ? { ...i, binding, label } : i
      ),
    };
  }
  if (items.length >= MAX_FAVORITE_PAGE_SHORTCUTS) {
    return {
      ok: false,
      message: `You can save at most ${MAX_FAVORITE_PAGE_SHORTCUTS} shortcuts.`,
    };
  }
  return {
    ok: true,
    next: [...items, { id: newId(), path, label, binding }],
  };
}

export function removeFavoritePageShortcut(
  items: FavoritePageShortcut[],
  id: string
): FavoritePageShortcut[] {
  return items.filter((i) => i.id !== id);
}
