import { useEffect, useMemo, useState } from 'react';
import { DASHBOARD_HOTKEY, getShortcutHelpRows } from './dashboardHotkeys';
import type { DashboardNavRow } from './dashboardNavConfig';
import type { FavoritePageShortcut } from './favoritePageShortcuts';
import {
  addOrUpdateFavoritePageShortcut,
  formatFavoriteShortcutDisplay,
  parseRecordedFavoriteBinding,
  removeFavoritePageShortcut,
} from './favoritePageShortcuts';
import { KEYBOARD_NAV_SKIP } from './formKeyboardNav';
import styles from './KeyboardShortcutsModal.module.css';

type KeyboardShortcutsModalProps = {
  open: boolean;
  onClose: () => void;
  modLabel: string;
  navRows: DashboardNavRow[];
  favorites: FavoritePageShortcut[];
  onFavoritesChange: (next: FavoritePageShortcut[]) => void;
};

export function KeyboardShortcutsModal({
  open,
  onClose,
  modLabel,
  navRows,
  favorites,
  onFavoritesChange,
}: KeyboardShortcutsModalProps) {
  const helpRows = useMemo(() => getShortcutHelpRows(modLabel), [modLabel]);

  const sortedNav = useMemo(() => {
    return [...navRows].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
    );
  }, [navRows]);

  const [selectedPath, setSelectedPath] = useState('');
  const [recordingPath, setRecordingPath] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setRecordingPath(null);
      setFormError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!sortedNav.some((r) => r.path === selectedPath)) {
      setSelectedPath(sortedNav[0]?.path ?? '');
    }
  }, [sortedNav, selectedPath]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === DASHBOARD_HOTKEY.closeOverlay) {
        e.preventDefault();
        e.stopPropagation();
        if (recordingPath) {
          setRecordingPath(null);
          setFormError(null);
        } else {
          onClose();
        }
        return;
      }

      if (!recordingPath) return;

      e.preventDefault();
      e.stopPropagation();
      const binding = parseRecordedFavoriteBinding(e);
      if (!binding) {
        setFormError(
          `Try a single F1–F12 key, or two keys together such as ${modLabel}+G, Alt+G, ${modLabel}+Shift+S, or ${modLabel}+F5.`
        );
        return;
      }
      const row = sortedNav.find((r) => r.path === recordingPath);
      if (!row) return;
      const result = addOrUpdateFavoritePageShortcut(
        favorites,
        row.path,
        row.label,
        binding
      );
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      setFormError(null);
      onFavoritesChange(result.next);
      setRecordingPath(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [
    open,
    onClose,
    recordingPath,
    sortedNav,
    favorites,
    modLabel,
    onFavoritesChange,
  ]);

  if (!open) return null;

  const selectedRow = sortedNav.find((r) => r.path === selectedPath);
  const canAssign = Boolean(selectedPath && selectedRow && sortedNav.length > 0);

  const startRecording = () => {
    if (!canAssign || !selectedRow) return;
    setFormError(null);
    setRecordingPath(selectedRow.path);
  };

  const cancelRecording = () => {
    setRecordingPath(null);
    setFormError(null);
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
      {...{ 'data-keyboard-nav': KEYBOARD_NAV_SKIP }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2 id="keyboard-shortcuts-title" className={styles.title}>
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className={styles.body}>
          <p className={styles.intro}>
            Most shortcuts work when focus is not in a field. While{' '}
            <strong>quick navigation</strong> is open (
            <kbd>{modLabel}</kbd> +{' '}
            <kbd>{DASHBOARD_HOTKEY.quickNavToggleModKey.toUpperCase()}</kbd> or{' '}
            <kbd>{DASHBOARD_HOTKEY.quickNavOpenSlash}</kbd>), use arrows,{' '}
            <kbd>Enter</kbd>, and <kbd>Alt</kbd> + <kbd>1</kbd>–<kbd>9</kbd>{' '}
            there. Close any dialog with <kbd>Esc</kbd> or ×.
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Action</th>
                <th>Shortcut</th>
              </tr>
            </thead>
            <tbody>
              {helpRows.map((row) => (
                <tr key={row.action}>
                  <td className={styles.action}>{row.action}</td>
                  <td className={styles.keys}>
                    {row.alternatives.map((segments, altIdx) => (
                      <span key={altIdx} className={styles.keyCombo}>
                        {segments.map((seg, segIdx) => (
                          <span key={`${seg}-${segIdx}`} className={styles.kbdGroup}>
                            {segIdx > 0 ? (
                              <span className={styles.kbdJoin}> + </span>
                            ) : null}
                            <kbd>{seg}</kbd>
                          </span>
                        ))}
                        {altIdx < row.alternatives.length - 1 ? (
                          <span className={styles.altSep}> or </span>
                        ) : null}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.divider} />

          <h3 className={styles.sectionTitle}>My page shortcuts</h3>
          <p className={styles.sectionIntro}>
            Jump straight to a screen you use often. Pick a page below, click{' '}
            <strong>Assign shortcut</strong>, then press one of: a{' '}
            <strong>function key</strong> alone (<kbd>F1</kbd>–<kbd>F12</kbd>
            ), or a <strong>two-part</strong> shortcut such as{' '}
            <kbd>{modLabel}</kbd> + <kbd>G</kbd>, <kbd>Alt</kbd> + <kbd>G</kbd>,{' '}
            or <kbd>{modLabel}</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>. Saved on
            this device only.
          </p>

          <div className={styles.favoriteToolbar}>
            <label className={styles.srOnly} htmlFor="favorite-page-select">
              Page to assign
            </label>
            <select
              id="favorite-page-select"
              className={styles.pageSelect}
              value={selectedPath}
              disabled={sortedNav.length === 0 || Boolean(recordingPath)}
              onChange={(e) => setSelectedPath(e.target.value)}
            >
              {sortedNav.map((r) => (
                <option key={r.path} value={r.path}>
                  {r.label}
                </option>
              ))}
            </select>
            {!recordingPath ? (
              <button
                type="button"
                className={styles.assignBtn}
                disabled={!canAssign}
                onClick={startRecording}
              >
                Assign shortcut
              </button>
            ) : (
              <button
                type="button"
                className={styles.cancelAssignBtn}
                onClick={cancelRecording}
              >
                Cancel
              </button>
            )}
          </div>

          {recordingPath ? (
            <p className={styles.recordingHint} role="status">
              Press your shortcut — e.g. <kbd>F7</kbd>,{' '}
              <kbd>{modLabel}</kbd> + <kbd>R</kbd>, or <kbd>Alt</kbd> +{' '}
              <kbd>2</kbd>.{' '}
              <span className={styles.recordingMuted}>
                Esc cancels recording.
              </span>
            </p>
          ) : null}
          {formError ? (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          ) : null}

          {favorites.length > 0 ? (
            <table className={`${styles.table} ${styles.favoritesTable}`}>
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Shortcut</th>
                  <th className={styles.colActions} />
                </tr>
              </thead>
              <tbody>
                {favorites.map((f) => (
                  <tr key={f.id}>
                    <td className={styles.action}>{f.label}</td>
                    <td className={styles.keys}>
                      {formatFavoriteShortcutDisplay(f, modLabel).map(
                        (segments, altIdx) => (
                          <span key={altIdx} className={styles.keyCombo}>
                            {segments.map((seg, segIdx) => (
                              <span
                                key={`${seg}-${segIdx}`}
                                className={styles.kbdGroup}
                              >
                                {segIdx > 0 ? (
                                  <span className={styles.kbdJoin}> + </span>
                                ) : null}
                                <kbd>{seg}</kbd>
                              </span>
                            ))}
                          </span>
                        )
                      )}
                    </td>
                    <td className={styles.colActions}>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() =>
                          onFavoritesChange(
                            removeFavoritePageShortcut(favorites, f.id)
                          )
                        }
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            !recordingPath && (
              <p className={styles.emptyFavorites}>
                No custom shortcuts yet. Assign one using the controls above.
              </p>
            )
          )}

          <p className={styles.note}>
            Quick navigation: <kbd>↑</kbd> <kbd>↓</kbd> highlight a page,{' '}
            <kbd>Enter</kbd> opens it. Hold <kbd>Alt</kbd> and press{' '}
            <kbd>1</kbd>–<kbd>9</kbd> to jump straight to the matching row
            (shown at the left of each line).
          </p>
        </div>
      </div>
    </div>
  );
}
