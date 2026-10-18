import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { PricingRate } from '@inventory-platform/contracts';
import { RatePicker } from './RatePicker';

const RULE_RATE: PricingRate = {
  name: 'Rate-A',
  price: 83.64,
  base: 'priceToRetail',
  baseValue: 100,
  discountPercent: 8,
  scheme: { schemeType: 'FIXED_UNITS', schemePayFor: 10, schemeFree: 1 },
  gstMode: 'EXCLUSIVE',
  termsText: 'PTR less 8%, 10+1',
};
const LEGACY_RATE: PricingRate = { name: 'Wholesale', price: 90 };

function setup(rates: PricingRate[], value?: string) {
  const onPick = vi.fn();
  render(<RatePicker rates={rates} value={value} onPick={onPick} />);
  return { onPick, select: screen.getByRole('combobox') as HTMLSelectElement };
}

function optionLabels(select: HTMLSelectElement): string[] {
  return Array.from(select.options).map((o) => o.textContent ?? '');
}

describe('RatePicker', () => {
  it('pickSendsRateNameOnly', () => {
    const { onPick, select } = setup([LEGACY_RATE, RULE_RATE]);
    fireEvent.change(select, { target: { value: 'Rate-A' } });
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith('Rate-A');
  });

  it('does not pick on Custom', () => {
    const { onPick, select } = setup([RULE_RATE], 'Rate-A');
    fireEvent.change(select, { target: { value: '__custom__' } });
    expect(onPick).not.toHaveBeenCalled();
  });

  it('optionLabelUsesApiTerms', () => {
    const { select } = setup([RULE_RATE]);
    expect(optionLabels(select)).toContain('Rate-A · 83.64/unit + GST · PTR less 8%, 10+1');
  });

  it('labels an inclusive rate incl. GST', () => {
    const { select } = setup([{ ...RULE_RATE, gstMode: 'INCLUSIVE' }]);
    expect(optionLabels(select)).toContain('Rate-A · 83.64/unit incl. GST · PTR less 8%, 10+1');
  });

  it('legacyRateHasNoTermsText', () => {
    const { select } = setup([LEGACY_RATE]);
    expect(optionLabels(select)).toEqual(['Custom', 'Wholesale · 90.00/unit']);
  });

  it('shows the given value and names it for screen readers', () => {
    const { select } = setup([LEGACY_RATE, RULE_RATE], 'Rate-A');
    expect(select.value).toBe('Rate-A');
    expect(select.getAttribute('aria-label')).toBe(
      'Rate: Rate-A · 83.64/unit + GST · PTR less 8%, 10+1',
    );
  });

  it('falls back to Custom without a value', () => {
    const { select } = setup([LEGACY_RATE]);
    expect(select.value).toBe('__custom__');
    expect(select.getAttribute('aria-label')).toBe('Select selling rate');
  });
});
