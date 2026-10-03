import { createElement } from 'react';
import { registerProfileTab } from '@inventory-platform/user';
import { BarcodeLabelLayoutSection } from '@inventory-platform/product';

/**
 * Profile tabs contributed by domain packages that `core/user` must not import
 * directly (dependency direction: product → user is not allowed to be reversed).
 * The registry is the composition layer, so the wiring lives here.
 */
export const BARCODE_LABELS_PROFILE_TAB_ID = 'labels';

let registered = false;

/**
 * Registers composed profile tabs into `core/user`'s profile tab registry.
 * Idempotent: safe to call from multiple modules / on both server and client
 * (the registry is a plain module, so calling at module load keeps SSR and
 * hydration of `/dashboard/profile` in sync).
 */
export function registerComposedProfileTabs(): void {
  if (registered) return;
  registered = true;
  registerProfileTab({
    id: BARCODE_LABELS_PROFILE_TAB_ID,
    label: 'Barcode labels',
    after: 'invoice',
    render: () => createElement(BarcodeLabelLayoutSection),
  });
}
