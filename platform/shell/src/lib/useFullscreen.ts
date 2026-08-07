import { useCallback, useEffect, useState } from 'react';

/**
 * Real browser fullscreen for the whole app — browser chrome (tabs, address bar)
 * is hidden by the browser itself, which CSS cannot do.
 *
 * Escape is deliberately not wired up here. Browsers reserve Escape to *exit*
 * fullscreen and it does not grant user activation, so requestFullscreen() from
 * an Escape keypress is rejected. Entering therefore has to come from a click.
 * Exiting needs no code at all — Escape is handled by the browser, and the
 * `fullscreenchange` listener below keeps our state in sync when it happens.
 */

/** Safari still ships only the webkit-prefixed names. */
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenEnabled?: boolean;
};

type FullscreenRoot = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function activeFullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null;
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/**
 * False when the browser has no Fullscreen API, or a permissions policy blocks it
 * (an embedding iframe without `allow="fullscreen"`). Callers use this to stay
 * quiet rather than advertise a control that cannot work.
 */
function fullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as FullscreenDocument;
  return Boolean(doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled);
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // Read after mount, never during render — `document` does not exist on the server.
  useEffect(() => {
    setIsSupported(fullscreenSupported());
  }, []);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(activeFullscreenElement()));
    // Covers Escape and the hotkey as well as our own button, so the icon never lies.
    sync();
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  /**
   * Leave fullscreen. Safe to call when not in fullscreen — it no-ops, which is
   * what makes it safe to wire to Escape: browsers are supposed to exit on Escape
   * by themselves, but when that does not happen there is otherwise no way out
   * except the button. Deliberately not `toggleFullscreen`, which would *enter*
   * fullscreen if the browser had already exited by the time we ran.
   */
  const exitFullscreen = useCallback(async () => {
    if (!activeFullscreenElement()) return;
    const doc = document as FullscreenDocument;
    try {
      await (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
    } catch {
      /* already exiting, or the browser refused — nothing to recover */
    }
  }, []);

  /** Must be invoked from a real user gesture (a click), not a keyboard shortcut. */
  const toggleFullscreen = useCallback(async () => {
    if (activeFullscreenElement()) {
      await exitFullscreen();
      return;
    }
    try {
      const root = document.documentElement as FullscreenRoot;
      await (root.requestFullscreen?.() ?? root.webkitRequestFullscreen?.());
    } catch {
      // Rejected — no user activation, or blocked by permissions policy when the
      // app is embedded in an iframe. State stays as-is; nothing to recover.
    }
  }, [exitFullscreen]);

  return { isFullscreen, isSupported, toggleFullscreen, exitFullscreen };
}
