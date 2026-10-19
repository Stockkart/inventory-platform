import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { PricingRate } from '@inventory-platform/contracts';
import {
  buildRateOptions,
  ratePickRequest,
  selectedRateValue,
  type RatePickRequest,
  type RateOptionSource,
} from '../../lib/scanSellRatePick';
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

function setup(source: RateOptionSource, value?: string, layout: 'list' | 'grid' = 'list') {
  const onPick = vi.fn();
  render(
    <RatePicker options={buildRateOptions(source)} value={value} onPick={onPick} layout={layout} />,
  );
  return { onPick, select: screen.getByRole('combobox') as HTMLSelectElement };
}

const rates = (...list: PricingRate[]): RateOptionSource => ({ rates: list });

interface CartLine {
  price: number;
  discount: number | null;
  appliedRateName: string | null;
}

interface PickHarnessProps {
  source: RateOptionSource;
  /** Stands in for the cart: answers a pick request with the line the API would return. */
  cart: (request: RatePickRequest) => CartLine;
  sent: RatePickRequest[];
}

/**
 * The page's pick loop on a shop with rate rules on: picker -> request -> cart response -> picker
 * value from appliedRateName.
 */
function PickHarness({ source, cart, sent }: PickHarnessProps) {
  const options = buildRateOptions(source);
  const [line, setLine] = useState<CartLine>({ price: 0, discount: null, appliedRateName: null });
  return (
    <>
      <RatePicker
        layout="list"
        options={options}
        value={selectedRateValue(options, line.price, line.appliedRateName)}
        onPick={(value) => {
          const request = ratePickRequest(options, value, true);
          if (!request) return;
          sent.push(request);
          setLine(cart(request));
        }}
      />
      <output aria-label="line terms">{`${line.price} less ${line.discount ?? 0}%`}</output>
    </>
  );
}

function optionLabels(select: HTMLSelectElement): string[] {
  return Array.from(select.options).map((o) => o.textContent ?? '');
}

describe('RatePicker', () => {
  it('pickSendsTheOptionValue', () => {
    const { onPick, select } = setup(rates(LEGACY_RATE, RULE_RATE));
    fireEvent.change(select, { target: { value: 'rate:Rate-A' } });
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith('rate:Rate-A');
  });

  it('pickRuleRateThenPtrSendsSystemNameAndShowsPtrTerms', () => {
    const sent: RatePickRequest[] = [];
    // A strip-of-10 line sold by the tablet: the cart bills per tablet.
    const cart = (request: RatePickRequest): CartLine =>
      'rateName' in request && request.rateName === 'Rate-A'
        ? { price: 10, discount: 8, appliedRateName: 'Rate-A' }
        : { price: 10, discount: null, appliedRateName: 'priceToRetail' };
    render(
      <PickHarness
        source={{ priceToRetail: 100, maximumRetailPrice: 120, rates: [RULE_RATE] }}
        cart={cart}
        sent={sent}
      />,
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;

    fireEvent.change(select, { target: { value: 'rate:Rate-A' } });
    expect(select.value).toBe('rate:Rate-A');
    expect(screen.getByLabelText('line terms').textContent).toBe('10 less 8%');

    fireEvent.change(select, { target: { value: 'system:priceToRetail' } });
    expect(sent).toEqual([{ rateName: 'Rate-A' }, { rateName: 'priceToRetail' }]);
    expect(select.value).toBe('system:priceToRetail');
    expect(select.getAttribute('aria-label')).toBe('Rate: PTR, ₹100.00');
    expect(screen.getByLabelText('line terms').textContent).toBe('10 less 0%');
  });

  it('does not pick on Custom', () => {
    const { onPick, select } = setup(rates(RULE_RATE), 'rate:Rate-A');
    fireEvent.change(select, { target: { value: '__custom__' } });
    expect(onPick).not.toHaveBeenCalled();
  });

  it('optionLabelUsesApiTerms', () => {
    const { select } = setup(rates(RULE_RATE));
    expect(optionLabels(select)).toContain('Rate-A · 83.64/unit + GST · PTR less 8%, 10+1');
  });

  it('labels an inclusive rate incl. GST', () => {
    const { select } = setup(rates({ ...RULE_RATE, gstMode: 'INCLUSIVE' }));
    expect(optionLabels(select)).toContain('Rate-A · 83.64/unit incl. GST · PTR less 8%, 10+1');
  });

  it('legacyAndSystemOptionsKeepMainsListLabel', () => {
    const { select } = setup({ maximumRetailPrice: 120, rates: [LEGACY_RATE] }, undefined, 'list');
    expect(optionLabels(select)).toEqual(['Custom', 'MRP · ₹120.00', 'Wholesale · ₹90.00']);
  });

  it('legacyAndSystemOptionsKeepMainsGridLabel', () => {
    const { select } = setup({ priceToRetail: 100, rates: [LEGACY_RATE] }, undefined, 'grid');
    expect(optionLabels(select)).toEqual(['Custom', 'PTR (₹100.00)', 'Wholesale (₹90.00)']);
  });

  it('ruleRateUsesTermsLabelInBothLayouts', () => {
    const { select } = setup(rates(RULE_RATE), undefined, 'grid');
    expect(optionLabels(select)).toContain('Rate-A · 83.64/unit + GST · PTR less 8%, 10+1');
  });

  it('namesALegacySelectionAsMainDid', () => {
    const { select } = setup(rates(LEGACY_RATE), 'rate:Wholesale');
    expect(select.getAttribute('aria-label')).toBe('Rate: Wholesale, ₹90.00');
  });

  it('shows the given value and names it for screen readers', () => {
    const { select } = setup(rates(LEGACY_RATE, RULE_RATE), 'rate:Rate-A');
    expect(select.value).toBe('rate:Rate-A');
    expect(select.getAttribute('aria-label')).toBe(
      'Rate: Rate-A · 83.64/unit + GST · PTR less 8%, 10+1',
    );
  });

  it('falls back to Custom without a value', () => {
    const { select } = setup(rates(LEGACY_RATE));
    expect(select.value).toBe('__custom__');
    expect(select.getAttribute('aria-label')).toBe('Select selling rate');
  });
});
