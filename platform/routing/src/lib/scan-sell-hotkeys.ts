/** US keyboard: Shift + ` → ~. Also matches `e.key === '~'`. */
export function isScanSellHidePurchaseKey(e: KeyboardEvent): boolean {
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  if (e.key === '~') return true;
  return e.code === 'Backquote' && e.shiftKey;
}

/** Skip tilde shortcut when typing in a text-like field. */
export function shouldSkipScanSellHidePurchaseKey(activeElement: Element | null): boolean {
  if (!activeElement || !(activeElement instanceof HTMLElement)) {
    return false;
  }
  if (activeElement.isContentEditable) return true;
  const tag = activeElement.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag !== 'INPUT') return false;
  const t = (activeElement as HTMLInputElement).type;
  return (
    t === 'text' ||
    t === 'search' ||
    t === 'url' ||
    t === 'tel' ||
    t === 'email' ||
    t === 'password' ||
    t === 'number' ||
    t === 'date' ||
    t === 'datetime-local' ||
    t === 'time' ||
    t === ''
  );
}
