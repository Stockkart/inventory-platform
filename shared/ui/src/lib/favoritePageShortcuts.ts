import type { DashboardNavRow } from './dashboardNavConfig';

const STORAGE_KEY = 'dashboardFavoritePageShortcuts';
export const MAX_FAVORITE_PAGE_SHORTCUTS = 24;

export type FavoritePageShortcut = {
  id: string;
  path: string;
  label: string;
  /** Lowercase letter or digit; combined with ⌘/Ctrl + Shift when triggering. */
  key: string;
};

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `fs-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
      const key = typeof r.key === 'string' ? r.key.toLowerCase() : '';
      if (!path || !/^[a-z0-9]$/.test(key)) continue;
      out.push({ id, path, label, key });
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

/** Sync labels from current nav (locale/menu changes). */
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
  return [[modLabel, 'Shift', s.key.toUpperCase()]];
}

export function parseRecordedFavoriteKey(
  e: KeyboardEvent
): string | null {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod || !e.shiftKey || e.altKey || e.repeat) return null;
  if (['Control', 'Meta', 'Shift'].includes(e.key)) return null;
  if (e.key.length !== 1 || !/^[a-zA-Z0-9]$/.test(e.key)) return null;
  return e.key.toLowerCase();
}

export function favoriteShortcutMatches(
  e: KeyboardEvent,
  s: FavoritePageShortcut
): boolean {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod || !e.shiftKey || e.altKey) return false;
  if (e.key.length !== 1) return false;
  return e.key.toLowerCase() === s.key;
}

export function findDuplicateKey(
  items: FavoritePageShortcut[],
  key: string,
  exceptId?: string
): boolean {
  const k = key.toLowerCase();
  return items.some((i) => i.key === k && i.id !== exceptId);
}

export function addOrUpdateFavoritePageShortcut(
  items: FavoritePageShortcut[],
  path: string,
  label: string,
  key: string
):
  | { ok: true; next: FavoritePageShortcut[] }
  | { ok: false; message: string } {
  const k = key.toLowerCase();
  const existing = items.find((i) => i.path === path);
  if (findDuplicateKey(items, k, existing?.id)) {
    return {
      ok: false,
      message: 'That key is already used for another page.',
    };
  }
  if (existing) {
    return {
      ok: true,
      next: items.map((i) =>
        i.path === path ? { ...i, key: k, label } : i
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
    next: [...items, { id: newId(), path, label, key: k }],
  };
}

export function removeFavoritePageShortcut(
  items: FavoritePageShortcut[],
  id: string
): FavoritePageShortcut[] {
  return items.filter((i) => i.id !== id);
}
