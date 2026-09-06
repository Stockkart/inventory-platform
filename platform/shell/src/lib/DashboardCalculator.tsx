import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CalculatorPanel,
  type FloatingPanelPosition,
  type TapeEntry,
} from '@inventory-platform/ui-kit';
import { loadCalculatorPanelState, saveCalculatorPanelState } from './calculatorPanelState';

export interface DashboardCalculatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SAVE_DEBOUNCE_MS = 300;

/**
 * Owns the calculator's persisted state so DashboardLayout does not have to.
 * Everything here is client-side; the panel never talks to the API.
 */
export function DashboardCalculator({ open, onOpenChange }: DashboardCalculatorProps) {
  // Storage is read after mount, never in a `useState` initializer: this tree is
  // server-rendered, and reading it during render would be a hydration mismatch.
  const [hydrated, setHydrated] = useState(false);
  const [position, setPosition] = useState<FloatingPanelPosition | null>(null);
  const [initial, setInitial] = useState<{ memory: number; tape: TapeEntry[] }>({
    memory: 0,
    tape: [],
  });
  const snapshotRef = useRef<{ memory: number; tape: TapeEntry[] }>({ memory: 0, tape: [] });

  useEffect(() => {
    const stored = loadCalculatorPanelState();
    if (stored) {
      setPosition(stored.x !== null && stored.y !== null ? { x: stored.x, y: stored.y } : null);
      setInitial({ memory: stored.memory, tape: stored.tape });
      snapshotRef.current = { memory: stored.memory, tape: stored.tape };
    }
    setHydrated(true);
  }, []);

  const persist = useCallback(
    (next: Partial<{ open: boolean; position: FloatingPanelPosition | null }> = {}) => {
      const pos = next.position !== undefined ? next.position : position;
      saveCalculatorPanelState({
        open: next.open !== undefined ? next.open : open,
        x: pos?.x ?? null,
        y: pos?.y ?? null,
        memory: snapshotRef.current.memory,
        tape: snapshotRef.current.tape,
      });
    },
    [open, position],
  );

  // Tape and memory churn while keys are pressed, so coalesce those writes. A drag
  // is already one write, since the panel only reports a position on pointer-up.
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!hydrated || revision === 0) return;
    const timer = setTimeout(() => persist(), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [revision, hydrated, persist]);

  const onStateChange = useCallback((snapshot: { memory: number; tape: TapeEntry[] }) => {
    snapshotRef.current = snapshot;
    setRevision((value) => value + 1);
  }, []);

  const onPositionChange = useCallback(
    (next: FloatingPanelPosition) => {
      setPosition(next);
      persist({ position: next });
    },
    [persist],
  );

  const onClose = useCallback(() => {
    onOpenChange(false);
    persist({ open: false });
  }, [onOpenChange, persist]);

  // Remember that the panel was left open, so it comes back on the next visit.
  useEffect(() => {
    if (!hydrated) return;
    persist({ open });
    // `persist` closes over `open`; re-running on the flag alone is what is wanted.
  }, [open, hydrated]);

  if (!hydrated) return null;

  return (
    <CalculatorPanel
      open={open}
      onClose={onClose}
      position={position}
      onPositionChange={onPositionChange}
      initialMemory={initial.memory}
      initialTape={initial.tape}
      onStateChange={onStateChange}
    />
  );
}
