/**
 * `resolveLaunchRoute` as a hook for the root navigator (task 13.2): runs the gate once on mount
 * and exposes its result, so the navigator can render a splash while `status` is `resolving` and
 * then set its initial route. `rerun()` runs the gate again (after a pairing completes, after a
 * wipe) without remounting the navigator.
 *
 * React only; no React Native import, so the file loads under vitest's node environment.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { resolveLaunchRoute, type LaunchGateDeps, type LaunchRoute } from './LaunchGate';

export type LaunchGateState =
  | { status: 'resolving' }
  | { status: 'ready'; route: LaunchRoute }
  /** The gate itself threw (a storage failure): the navigator shows the pairing screen. */
  | { status: 'failed'; error: unknown; route: LaunchRoute };

export interface UseLaunchGate {
  state: LaunchGateState;
  /** Runs the gate again; the state goes back to `resolving` meanwhile. */
  rerun: () => void;
}

export function useLaunchGate(deps: LaunchGateDeps): UseLaunchGate {
  const [state, setState] = useState<LaunchGateState>({ status: 'resolving' });
  const [run, setRun] = useState(0);
  const depsRef = useRef(deps);
  depsRef.current = deps;

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'resolving' });
    resolveLaunchRoute(depsRef.current).then(
      (route) => {
        if (!cancelled) {
          setState({ status: 'ready', route });
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({ status: 'failed', error, route: { name: 'Pair' } });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [run]);

  const rerun = useCallback(() => setRun((n) => n + 1), []);
  return { state, rerun };
}
