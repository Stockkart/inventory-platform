/**
 * Public surface of `src/pairing`. Everything here is pure (no Expo or React Native import); the
 * device description the flow needs on a phone comes from `../device/deviceInfo`.
 */
export {
  CodeAttemptLockout,
  LOCKOUT_DURATION_MS,
  LOCKOUT_LIMIT,
  LOCKOUT_WINDOW_MS,
  lockoutCountdown,
  minutesFromLockedMessage,
} from './CodeAttemptLockout';
export { PairingFlow, capabilityMessage } from './PairingFlow';
export type {
  AgreeResult,
  DeclineResult,
  DeviceInfo,
  PairingClient,
  PairingFlowDeps,
  PairingSigner,
  PairingStoreLike,
  SubmitCodeResult,
} from './PairingFlow';
