/**
 * "Is the server reachable right now?" asked **before** the biometric prompt (R6.1, R6.2; task
 * 14.3). `PunchFlow` signs exactly one payload per tap, and that payload says whether it was
 * recorded online (`offline = 0`) or on the phone (`offline = 1`); the punch key unlocks once per
 * prompt (design DD4), so the flow cannot sign a second payload after a failed send without asking
 * the worker for a second fingerprint. The probe answers the question first, so the one signature
 * says the right thing.
 *
 * Two steps, cheapest first:
 *
 * 1. {@link ReachabilityDeps.network}: what the phone reports about its connection (NetInfo on the
 *    phone, `./expoNetwork.ts`). "No connection" is R6.1's first case and needs no request and no
 *    10 s wait. "Connected" or "unknown" proves nothing about the server, so the probe goes on.
 * 2. `GET /me` through the client, with the client's 10 s timeout (R6.1's second and third cases).
 *    Any **answer** means reachable, a refusal included (the server spoke; the punch send will get
 *    the real refusal and the flow shows it word for word). {@link NotReachable} means not reachable.
 *
 * Pure: no Expo or React Native import. Tests pass a fake client and a fake network reader.
 */
import { isNotReachable } from '../api/appClient';

/** What the flow asks: true = send online now; false = sign `offline = 1` and queue (R6.2). */
export interface Reachability {
  probe(): Promise<boolean>;
}

/** The slice of `AppClient` the probe calls. */
export interface ProbeClient {
  getMe(): Promise<unknown>;
}

export interface ReachabilityDeps {
  client: ProbeClient;
  /**
   * The phone's own view of its connection (R6.1 "the phone reports no network connection"):
   * false = no connection; true = connected or unknown. Optional: without it the probe asks the
   * server straight away.
   */
  network?: () => Promise<boolean>;
}

export function serverReachability(deps: ReachabilityDeps): Reachability {
  return {
    async probe(): Promise<boolean> {
      if (deps.network) {
        let connected: boolean;
        try {
          connected = await deps.network();
        } catch {
          connected = true; // the reader failed, not the network; let the server decide
        }
        if (!connected) {
          return false;
        }
      }
      try {
        await deps.client.getMe();
        return true;
      } catch (error) {
        return !isNotReachable(error);
      }
    },
  };
}

/** A probe that always says "reachable": the online path only; for tests of that path. */
export const ALWAYS_REACHABLE: Reachability = { probe: async () => true };
