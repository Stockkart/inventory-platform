/**
 * Dashboard keyboard shortcuts — define bindings here only.
 * Handlers (DashboardLayout) and help UI read from the same values.
 */
export const DASHBOARD_HOTKEY = {
  quickNavToggleModKey: 'k',
  quickNavOpenSlash: '/',
  toggleSidebarModKey: 'b',
  shortcutsHelp: '?',
  closeOverlay: 'Escape',
} as const;

export function getDashboardModLabel(): '⌘' | 'Ctrl' {
  if (typeof navigator === 'undefined') return 'Ctrl';
  return /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent) ? '⌘' : 'Ctrl';
}

export type ShortcutHelpRow = {
  action: string;
  /** Each entry is one shortcut alternative (shown as key chips in order). */
  alternatives: string[][];
};

export function getShortcutHelpRows(modLabel: string): ShortcutHelpRow[] {
  const h = DASHBOARD_HOTKEY;
  return [
    {
      action: 'Open quick navigation',
      alternatives: [
        [modLabel, h.quickNavToggleModKey.toUpperCase()],
        [h.quickNavOpenSlash],
      ],
    },
    {
      action: 'Toggle sidebar',
      alternatives: [[modLabel, h.toggleSidebarModKey.toUpperCase()]],
    },
    {
      action: 'Show this help',
      alternatives: [[h.shortcutsHelp]],
    },
    {
      action: 'Close dialog / palette',
      alternatives: [['Esc']],
    },
  ];
}

export type QuickNavFooterHint = { keys: string[]; description: string };

export function getQuickNavFooterHints(modLabel: string): QuickNavFooterHint[] {
  const h = DASHBOARD_HOTKEY;
  return [
    { keys: ['↑', '↓'], description: 'move' },
    { keys: ['Enter'], description: 'open' },
    { keys: ['Alt', '1–9'], description: 'jump' },
    {
      keys: [modLabel, h.quickNavToggleModKey.toUpperCase()],
      description: 'toggle',
    },
  ];
}

/** Match Cmd/Ctrl+letter (case-insensitive on `key`). */
export function isModLetter(e: KeyboardEvent, letter: string): boolean {
  const mod = e.metaKey || e.ctrlKey;
  return mod && e.key.toLowerCase() === letter.toLowerCase();
}

export function isQuickNavSlash(e: KeyboardEvent): boolean {
  const mod = e.metaKey || e.ctrlKey;
  return (
    !mod &&
    !e.altKey &&
    e.key === DASHBOARD_HOTKEY.quickNavOpenSlash
  );
}

export function isShortcutsHelp(e: KeyboardEvent): boolean {
  return e.key === DASHBOARD_HOTKEY.shortcutsHelp;
}
