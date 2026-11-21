import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { CalculatorPanel, type FloatingPanelPosition } from '@inventory-platform/ui-kit';
import {
  calculatorReducer,
  createCalculatorState,
  formatDisplay,
  formatNumber,
  formatPending,
  keyToAction,
} from './calculatorEngine';
import {
  loadCalculatorPanelState,
  saveCalculatorPanelState,
  type CalculatorPanelSnapshot,
} from './calculatorPanelState';

export interface DashboardCalculatorProps {
  /**
   * The active shop. DashboardLayout also keys this component by it, so a shop
   * switch unmounts the old shop's calculator (saving it under the old shop) and
   * mounts a fresh one loaded from the new shop's storage.
   */
  shopId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SAVE_DEBOUNCE_MS = 300;

/**
 * Owns the calculator's state and persistence so DashboardLayout does not have
 * to. Everything here is client-side; the panel never talks to the API.
 */
export function DashboardCalculator({ shopId, open, onOpenChange }: DashboardCalculatorProps) {
  // `undefined` until storage has been read. Storage is read after mount, never
  // during render: this tree is server-rendered, so reading it in render would be
  // a hydration mismatch.
  const [stored, setStored] = useState<CalculatorPanelSnapshot | null | undefined>(undefined);
  // True while a panel restored on page load is open: it must not take focus.
  const [restoredOpen, setRestoredOpen] = useState(false);

  useEffect(() => {
    const snapshot = loadCalculatorPanelState(shopId);
    setStored(snapshot);
    setRestoredOpen(Boolean(snapshot?.open));
    onOpenChange(Boolean(snapshot?.open));
  }, [shopId, onOpenChange]);

  useEffect(() => {
    if (!open) setRestoredOpen(false);
  }, [open]);

  if (stored === undefined) return null;

  return (
    <CalculatorSession
      shopId={shopId}
      initial={stored}
      open={open}
      autoFocus={!restoredOpen}
      onClose={() => onOpenChange(false)}
    />
  );
}

interface CalculatorSessionProps {
  shopId: string | null;
  initial: CalculatorPanelSnapshot | null;
  open: boolean;
  autoFocus: boolean;
  onClose: () => void;
}

/** Mounted once storage has been read, so the reducer starts from the saved state. */
function CalculatorSession({ shopId, initial, open, autoFocus, onClose }: CalculatorSessionProps) {
  const [state, dispatch] = useReducer(
    calculatorReducer,
    { memory: initial?.memory ?? 0, tape: initial?.tape ?? [] },
    createCalculatorState,
  );
  const [position, setPosition] = useState<FloatingPanelPosition | null>(
    initial && initial.x !== null && initial.y !== null ? { x: initial.x, y: initial.y } : null,
  );

  // The newest values, for a save that runs from a timer or on unmount. Synced in
  // an effect declared before the save effects, so they always see this render.
  const latest = useRef({ open, position, memory: state.memory, tape: state.tape });
  useEffect(() => {
    latest.current = { open, position, memory: state.memory, tape: state.tape };
  });

  const save = useCallback(() => {
    const { open: isOpen, position: pos, memory, tape } = latest.current;
    saveCalculatorPanelState(shopId, {
      open: isOpen,
      x: pos?.x ?? null,
      y: pos?.y ?? null,
      memory,
      tape,
    });
  }, [shopId]);

  // Tape and memory churn while keys are pressed, so coalesce those writes.
  useEffect(() => {
    const timer = setTimeout(save, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state.memory, state.tape, save]);

  // Open state and position change once per gesture: write straight away.
  useEffect(() => {
    save();
  }, [open, position, save]);

  // A shop switch or logout unmounts this; keep key presses still inside the debounce.
  useEffect(() => () => save(), [save]);

  return (
    <CalculatorPanel
      open={open}
      onClose={onClose}
      position={position}
      onPositionChange={setPosition}
      autoFocus={autoFocus}
      display={state.error ?? formatDisplay(state)}
      error={state.error !== null}
      pending={formatPending(state)}
      memory={state.memory !== 0 ? formatNumber(state.memory) : null}
      tape={state.tape}
      onKey={(key) => dispatch(keyToAction(key))}
      onRecallTape={(row) => dispatch({ type: 'recallTape', value: row.result })}
      onClearTape={() => dispatch({ type: 'clearTape' })}
    />
  );
}
