import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { PROFILE_TABS, ProfileTabs, orderProfileTabs } from './ProfileTabs';
import {
  registerProfileTab,
  unregisterProfileTab,
  useProfileTabExtensions,
  type ProfileTabExtension,
} from './profileTabRegistry';

// Feature: barcode-label-layout, Requirement 5.1: "Barcode labels" tab sits right after "Invoice layout"

const render_ = () => null;

function ext(id: string, label: string, after?: ProfileTabExtension['after']): ProfileTabExtension {
  return { id, label, render: render_, after };
}

const ids = (tabs: { id: string }[]) => tabs.map((tab) => tab.id);

describe('orderProfileTabs', () => {
  it('returns only built-in tabs when there are no extensions', () => {
    expect(ids(orderProfileTabs([]))).toEqual(PROFILE_TABS.map((tab) => tab.id));
  });

  it('places an extension immediately after its `after` anchor', () => {
    const tabs = orderProfileTabs([ext('labels', 'Barcode labels', 'invoice')]);
    const result = ids(tabs);
    expect(result).toEqual(['shop', 'numbering', 'invoice', 'labels']);
    expect(result.indexOf('labels')).toBe(result.indexOf('invoice') + 1);
    expect(tabs.find((tab) => tab.id === 'labels')?.label).toBe('Barcode labels');
  });

  it('inserts between built-ins when anchored to a middle tab', () => {
    expect(ids(orderProfileTabs([ext('x', 'X', 'shop')]))).toEqual([
      'shop',
      'x',
      'numbering',
      'invoice',
    ]);
  });

  it('puts extensions with a missing or unknown anchor last', () => {
    const tabs = orderProfileTabs([
      ext('noAnchor', 'No anchor'),
      // Unknown anchor is a runtime-only case; the type restricts it to built-in ids.
      ext('unknownAnchor', 'Unknown anchor', 'nope' as ProfileTabExtension['after']),
      ext('labels', 'Barcode labels', 'invoice'),
    ]);
    expect(ids(tabs)).toEqual([
      'shop',
      'numbering',
      'invoice',
      'labels',
      'noAnchor',
      'unknownAnchor',
    ]);
  });

  it('keeps registration order among extensions sharing an anchor', () => {
    const tabs = orderProfileTabs([
      ext('a', 'A', 'invoice'),
      ext('b', 'B', 'invoice'),
      ext('c', 'C', 'invoice'),
    ]);
    expect(ids(tabs)).toEqual(['shop', 'numbering', 'invoice', 'a', 'b', 'c']);
  });
});

describe('ProfileTabs with a registered extension', () => {
  afterEach(() => {
    act(() => unregisterProfileTab('labels'));
  });

  it('renders "Barcode labels" directly after "Invoice layout" and reports clicks', () => {
    registerProfileTab(ext('labels', 'Barcode labels', 'invoice'));
    const onTabChange = vi.fn();

    render(<ProfileTabs activeTab="shop" onTabChange={onTabChange} />);

    const labels = screen.getAllByRole('tab').map((el) => el.textContent?.trim());
    expect(labels).toEqual(['Shop', 'Invoice numbering', 'Invoice layout', 'Barcode labels']);
    expect(labels.indexOf('Barcode labels')).toBe(labels.indexOf('Invoice layout') + 1);

    fireEvent.click(screen.getByRole('tab', { name: 'Barcode labels' }));
    expect(onTabChange).toHaveBeenCalledWith('labels');
  });

  it('marks the extension tab selected when it is active', () => {
    registerProfileTab(ext('labels', 'Barcode labels', 'invoice'));

    render(<ProfileTabs activeTab="labels" onTabChange={vi.fn()} />);

    expect(screen.getByRole('tab', { name: 'Barcode labels' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Invoice layout' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('re-renders when an extension is registered after mount', () => {
    render(<ProfileTabs activeTab="shop" onTabChange={vi.fn()} />);
    expect(screen.queryByRole('tab', { name: 'Barcode labels' })).not.toBeInTheDocument();

    act(() => {
      registerProfileTab(ext('labels', 'Barcode labels', 'invoice'));
    });

    expect(screen.getByRole('tab', { name: 'Barcode labels' })).toBeInTheDocument();
  });
});

describe('useProfileTabExtensions', () => {
  afterEach(() => {
    act(() => unregisterProfileTab('labels'));
  });

  it('exposes registered extensions and updates on register/unregister', () => {
    const { result } = renderHook(() => useProfileTabExtensions());
    expect(result.current.some((e) => e.id === 'labels')).toBe(false);

    act(() => {
      registerProfileTab(ext('labels', 'Barcode labels', 'invoice'));
    });
    expect(result.current.find((e) => e.id === 'labels')?.after).toBe('invoice');

    act(() => {
      unregisterProfileTab('labels');
    });
    expect(result.current.some((e) => e.id === 'labels')).toBe(false);
  });

  it('replaces an extension registered twice with the same id', () => {
    const { result } = renderHook(() => useProfileTabExtensions());

    act(() => {
      registerProfileTab(ext('labels', 'First', 'invoice'));
      registerProfileTab(ext('labels', 'Second', 'invoice'));
    });

    const matches = result.current.filter((e) => e.id === 'labels');
    expect(matches).toHaveLength(1);
    expect(matches[0]?.label).toBe('Second');
  });
});
