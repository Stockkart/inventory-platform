import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

/** Regions that opt out of the global main-area navigator (nested grids, widgets, etc.). */
export const KEYBOARD_NAV_ATTR = 'data-keyboard-nav' as const;

/** Skip global handling; use for chat, rich widgets, or nested grid handlers. */
export const KEYBOARD_NAV_SKIP = 'skip' as const;
/** Excel-style table: ArrowUp/Down move by column; handled by a local listener. */
export const KEYBOARD_NAV_GRID = 'grid' as const;

const LIST_FOCUSABLE_SELECTOR =
  'input:not([disabled]):not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]), select:not([disabled]), textarea:not([disabled])';

const GRID_FOCUSABLE_SELECTOR =
  'tbody input:not([disabled]):not([type="hidden"]), tbody select:not([disabled]), tbody button:not([disabled])';

function baseSkipRules(el: HTMLElement, opts: { skipDialogs: boolean }): boolean {
  if (el.isContentEditable) return true;
  if (el.closest('[contenteditable="true"]')) return true;
  if (el.closest(`[${KEYBOARD_NAV_ATTR}="${KEYBOARD_NAV_SKIP}"]`)) return true;
  if (opts.skipDialogs) {
    if (el.closest('[role="dialog"]')) return true;
    if (el.closest('[role="alertdialog"]')) return true;
  }
  if (el.closest('[role="listbox"]')) return true;
  if (el.closest('[role="menu"]')) return true;
  if (el.closest('[role="menubar"]')) return true;
  if (el.closest('[role="grid"]')) return true;
  if (el.closest('[role="tree"]')) return true;
  const t = el.tagName;
  if (t === 'INPUT') {
    const type = (el as HTMLInputElement).type?.toLowerCase();
    if (type === 'radio' || type === 'range' || type === 'file') return true;
  }
  return false;
}

/**
 * Dashboard `<main>`: skip when focus is inside a dialog so we don’t mix modal
 * fields with the rest of the page. Dialogs should use `FormKeyboardNavScope`.
 */
export function shouldSkipGlobalMainKeyboardNav(
  focused: Element | null
): boolean {
  if (!focused || !(focused instanceof HTMLElement)) return true;
  return baseSkipRules(focused, { skipDialogs: true });
}

/**
 * `FormKeyboardNavScope` and Excel grids: same as global except dialog is
 * **not** skipped so Enter/↑/↓ work inside `EditModal` and similar.
 */
export function shouldSkipNestedFormKeyboardNav(
  focused: Element | null
): boolean {
  if (!focused || !(focused instanceof HTMLElement)) return true;
  return baseSkipRules(focused, { skipDialogs: false });
}

/** @deprecated Use shouldSkipGlobalMainKeyboardNav or shouldSkipNestedFormKeyboardNav */
export function shouldSkipContainerKeyboardNav(focused: Element | null): boolean {
  return shouldSkipGlobalMainKeyboardNav(focused);
}

/**
 * Enter: next field; Shift+Enter: previous. ArrowUp/Down: list = sequential;
 * grid = same table column, adjacent row.
 */
export function runFormKeyboardNavigation(
  e: ReactKeyboardEvent<HTMLElement> | KeyboardEvent,
  container: HTMLElement,
  mode: 'list' | 'grid'
): void {
  const active = document.activeElement as HTMLElement | null;
  if (!active || !container.contains(active)) return;

  const focusableSelector =
    mode === 'grid' ? GRID_FOCUSABLE_SELECTOR : LIST_FOCUSABLE_SELECTOR;

  const list = Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelector)
  );
  const idx = list.indexOf(active);
  if (idx < 0) return;

  const tag = active.tagName;

  if (e.key === 'Enter' && e.shiftKey) {
    if (tag === 'TEXTAREA') return;
    e.preventDefault();
    const prev = list[idx - 1];
    if (prev) prev.focus();
    return;
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    if (tag === 'SELECT' || tag === 'BUTTON' || tag === 'TEXTAREA') return;
    if (tag === 'INPUT') {
      const it = (active as HTMLInputElement).type?.toLowerCase();
      if (it === 'checkbox' || it === 'radio') return;
    }
    e.preventDefault();
    const next = list[idx + 1];
    if (next) next.focus();
    return;
  }

  if (e.key === 'ArrowDown') {
    if (tag === 'TEXTAREA') return;
    e.preventDefault();
    if (mode === 'list') {
      const next = list[idx + 1];
      if (next) next.focus();
      return;
    }
    const tbody = container.querySelector('tbody');
    const firstRow = tbody?.querySelector('tr');
    if (!tbody || !firstRow) return;
    const fieldsPerRow = firstRow.querySelectorAll('input, select, button')
      .length;
    const numRows = tbody.querySelectorAll('tr').length;
    const col = idx % fieldsPerRow;
    const row = Math.floor(idx / fieldsPerRow);
    if (row + 1 >= numRows) return;
    const next = list[(row + 1) * fieldsPerRow + col];
    if (next) next.focus();
    return;
  }

  if (e.key === 'ArrowUp') {
    if (tag === 'TEXTAREA') return;
    e.preventDefault();
    if (mode === 'list') {
      const prev = list[idx - 1];
      if (prev) prev.focus();
      return;
    }
    const tbody = container.querySelector('tbody');
    const firstRow = tbody?.querySelector('tr');
    if (!tbody || !firstRow) return;
    const fieldsPerRow = firstRow.querySelectorAll('input, select, button')
      .length;
    const col = idx % fieldsPerRow;
    const row = Math.floor(idx / fieldsPerRow);
    if (row <= 0) return;
    const prev = list[(row - 1) * fieldsPerRow + col];
    if (prev) prev.focus();
  }
}
