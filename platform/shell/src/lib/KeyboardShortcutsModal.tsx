import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Label,
  Modal,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
} from '@inventory-platform/ui-kit';
import { DASHBOARD_HOTKEY, getShortcutHelpRows } from './dashboardHotkeys';
import type { DashboardNavRow } from '@inventory-platform/routing';
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

function ShortcutKeys({
  alternatives,
}: {
  alternatives: string[][];
}) {
  return (
    <>
      {alternatives.map((segments, altIdx) => (
        <Text key={altIdx} as="span" className={styles.keyCombo}>
          {segments.map((seg, segIdx) => (
            <Text key={`${seg}-${segIdx}`} as="span" className={styles.kbdGroup}>
              {segIdx > 0 ? (
                <Text as="span" className={styles.kbdJoin}>
                  {' '}
                  +{' '}
                </Text>
              ) : null}
              <Text as="kbd">{seg}</Text>
            </Text>
          ))}
          {altIdx < alternatives.length - 1 ? (
            <Text as="span" className={styles.altSep}>
              {' '}
              or{' '}
            </Text>
          ) : null}
        </Text>
      ))}
    </>
  );
}

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
    <Modal open={open} onClose={onClose} size="lg" className={styles.modalPanel}>
      <Box {...{ 'data-keyboard-nav': KEYBOARD_NAV_SKIP }}>
        <Modal.Header title="Keyboard shortcuts" onClose={onClose} />
        <Modal.Body>
          <Text className={styles.intro}>
            Most shortcuts work when focus is not in a field. While{' '}
            <Text as="strong">quick navigation</Text> is open (
            <Text as="kbd">{modLabel}</Text> +{' '}
            <Text as="kbd">
              {DASHBOARD_HOTKEY.quickNavToggleModKey.toUpperCase()}
            </Text>{' '}
            or <Text as="kbd">{DASHBOARD_HOTKEY.quickNavOpenSlash}</Text>), use
            arrows, <Text as="kbd">Enter</Text>, and <Text as="kbd">Alt</Text> +{' '}
            <Text as="kbd">1</Text>–<Text as="kbd">9</Text> there. Close any
            dialog with <Text as="kbd">Esc</Text> or ×.
          </Text>
          <Table className={styles.table}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Action</TableHeaderCell>
                <TableHeaderCell>Shortcut</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {helpRows.map((row) => (
                <TableRow key={row.action}>
                  <TableCell className={styles.action}>{row.action}</TableCell>
                  <TableCell className={styles.keys}>
                    <ShortcutKeys alternatives={row.alternatives} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Box className={styles.divider} />

          <Text variant="heading3" className={styles.sectionTitle}>
            My page shortcuts
          </Text>
          <Text className={styles.sectionIntro}>
            Jump straight to a screen you use often. Pick a page below, click{' '}
            <Text as="strong">Assign shortcut</Text>, then press one of: a{' '}
            <Text as="strong">function key</Text> alone (
            <Text as="kbd">F1</Text>–<Text as="kbd">F12</Text>), or a{' '}
            <Text as="strong">two-part</Text> shortcut such as{' '}
            <Text as="kbd">{modLabel}</Text> + <Text as="kbd">G</Text>,{' '}
            <Text as="kbd">Alt</Text> + <Text as="kbd">G</Text>, or{' '}
            <Text as="kbd">{modLabel}</Text> + <Text as="kbd">Shift</Text> +{' '}
            <Text as="kbd">S</Text>. Saved on this device only.
          </Text>

          <Box className={styles.favoriteToolbar}>
            <Label htmlFor="favorite-page-select" className={styles.srOnly}>
              Page to assign
            </Label>
            <Select
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
            </Select>
            {!recordingPath ? (
              <Button
                type="button"
                size="sm"
                disabled={!canAssign}
                onClick={startRecording}
              >
                Assign shortcut
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={cancelRecording}
              >
                Cancel
              </Button>
            )}
          </Box>

          {recordingPath ? (
            <Alert variant="info" role="status" className={styles.recordingHint}>
              Press your shortcut — e.g. <Text as="kbd">F7</Text>,{' '}
              <Text as="kbd">{modLabel}</Text> + <Text as="kbd">R</Text>, or{' '}
              <Text as="kbd">Alt</Text> + <Text as="kbd">2</Text>.{' '}
              <Text as="span" className={styles.recordingMuted}>
                Esc cancels recording.
              </Text>
            </Alert>
          ) : null}
          {formError ? (
            <Alert variant="danger" className={styles.formError}>
              {formError}
            </Alert>
          ) : null}

          {favorites.length > 0 ? (
            <Table className={`${styles.table} ${styles.favoritesTable}`}>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Page</TableHeaderCell>
                  <TableHeaderCell>Shortcut</TableHeaderCell>
                  <TableHeaderCell className={styles.colActions} />
                </TableRow>
              </TableHead>
              <TableBody>
                {favorites.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className={styles.action}>{f.label}</TableCell>
                    <TableCell className={styles.keys}>
                      <ShortcutKeys
                        alternatives={formatFavoriteShortcutDisplay(f, modLabel)}
                      />
                    </TableCell>
                    <TableCell className={styles.colActions}>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          onFavoritesChange(
                            removeFavoritePageShortcut(favorites, f.id)
                          )
                        }
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            !recordingPath && (
              <Text className={styles.emptyFavorites}>
                No custom shortcuts yet. Assign one using the controls above.
              </Text>
            )
          )}

          <Text className={styles.note}>
            Quick navigation: <Text as="kbd">↑</Text> <Text as="kbd">↓</Text>{' '}
            highlight a page, <Text as="kbd">Enter</Text> opens it. Hold{' '}
            <Text as="kbd">Alt</Text> and press <Text as="kbd">1</Text>–
            <Text as="kbd">9</Text> to jump straight to the matching row
            (shown at the left of each line).
          </Text>
        </Modal.Body>
      </Box>
    </Modal>
  );
}
