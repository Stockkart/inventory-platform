/**
 * `expo-crypto` as the digest and UUID source of {@link AppClient} on the phone. Hermes has no
 * `crypto.subtle` and, without a polyfill, no `crypto.randomUUID`, so the composition root passes
 * these two in `AppClientDeps`. Kept apart from `appClient.ts` so the client stays free of native
 * imports and its tests run in plain node.
 */
import { CryptoDigestAlgorithm, digest, randomUUID } from 'expo-crypto';

import type { Sha256 } from '@inventory-platform/attendance-protocol';

/** SHA-256 over bytes for the envelope's `bodySha256`. */
export const expoSha256: Sha256 = (bytes) =>
  digest(CryptoDigestAlgorithm.SHA256, bytes as Uint8Array<ArrayBuffer>);

/** A lowercase UUID v4 for nonces, punch ids and the installation id. */
export function expoRandomUUID(): string {
  return randomUUID().toLowerCase();
}
