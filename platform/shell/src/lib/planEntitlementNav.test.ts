import { describe, expect, it } from 'vitest';
import type { NavContribution } from '@inventory-platform/routing';
import { mergeNavContributions } from '@inventory-platform/routing';
import {
  filterMenuGroupsByEntitlements,
  isPathEntitled,
  planFeatureForPath,
} from './planEntitlementNav';

const contributions: NavContribution[] = [
  {
    groupId: 'products',
    label: 'Products',
    icon: 'package',
    items: [
      { path: '/dashboard/product-search', label: 'Product Search', icon: 'search' },
      {
        path: '/dashboard/barcodes',
        label: 'Barcodes',
        icon: 'barcode',
        requiresFeature: 'BARCODE_GENERATOR',
      },
    ],
  },
  {
    groupId: 'credit',
    label: 'Credit',
    icon: 'handshake',
    requiresFeature: 'CREDIT_BALANCE',
    items: [{ path: '/dashboard/credit', label: 'Credit balances', icon: 'handshake' }],
  },
  {
    groupId: 'accounting',
    label: 'Accounting',
    icon: 'book-open',
    requiresFeature: 'ACCOUNTING',
    items: [
      { path: '/dashboard/accounting', label: 'Overview', icon: 'layout-dashboard' },
      { path: '/dashboard/accounting/ledger', label: 'Ledger', icon: 'book-open' },
    ],
  },
];
const groups = mergeNavContributions(contributions, ['products', 'credit', 'accounting']);
const enforcing = { enforcement: 'ENFORCE' as const, features: ['CREDIT_BALANCE'] };

describe('planFeatureForPath', () => {
  it('reads the feature from the nav item, group-level features included', () => {
    expect(planFeatureForPath(groups, '/dashboard/barcodes')).toBe('BARCODE_GENERATOR');
    expect(planFeatureForPath(groups, '/dashboard/accounting')).toBe('ACCOUNTING');
    expect(planFeatureForPath(groups, '/dashboard/credit')).toBe('CREDIT_BALANCE');
  });

  it('covers paths under a gated item', () => {
    expect(planFeatureForPath(groups, '/dashboard/accounting/journal/new')).toBe('ACCOUNTING');
  });

  it('does not match a path that only shares a prefix', () => {
    expect(planFeatureForPath(groups, '/dashboard/credit-notes')).toBeNull();
    expect(planFeatureForPath(groups, '/dashboard/product-search')).toBeNull();
    expect(planFeatureForPath(groups, '/dashboard/overview')).toBeNull();
  });
});

describe('isPathEntitled', () => {
  it('blocks gated paths the plan lacks only when enforcing', () => {
    expect(isPathEntitled(groups, '/dashboard/accounting/ledger', enforcing)).toBe(false);
    expect(isPathEntitled(groups, '/dashboard/credit', enforcing)).toBe(true);
    expect(isPathEntitled(groups, '/dashboard/overview', enforcing)).toBe(true);
    expect(isPathEntitled(groups, '/dashboard/accounting', null)).toBe(true);
  });
});

describe('filterMenuGroupsByEntitlements', () => {
  it('drops items the plan lacks and empty groups', () => {
    const filtered = filterMenuGroupsByEntitlements(groups, enforcing);
    expect(filtered.map((g) => g.id)).toEqual(['products', 'credit']);
    expect(filtered[0]?.items.map((i) => i.path)).toEqual(['/dashboard/product-search']);
  });

  it('keeps everything when the backend is not enforcing', () => {
    const filtered = filterMenuGroupsByEntitlements(groups, {
      enforcement: 'LOG_ONLY',
      features: [],
    });
    expect(filtered).toEqual(groups);
  });
});
