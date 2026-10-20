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
  const onOpen = vi.fn();
  render(
    <RatePicker
      options={buildRateOptions(source)}
      value={value}
      onPick={onPick}
      onOpen={onOpen}
      layout={layout}
    />,
  );
  return { onPick, onOpen };
}

/** The dropdown's button; its name is what the line shows (`Rate: …`). */
function trigger(): HTMLElement {
  return screen.getByRole('button', { name: /^Rate/ });
}

function openPicker() {
  fireEvent.click(trigger());
}

function pick(label: string) {
  openPicker();
  fireEvent.click(screen.getByRole('option', { name: label }));
}

function optionLabels(): string[] {
  openPicker();
  return screen.getAllByRole('option').map((o) => o.textContent ?? '');
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

describe('RatePicker', () => {
  it('is a custom dropdown, not a native select', () => {
    setup(rates(LEGACY_RATE));
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('listbox')).toBeNull();
    openPicker();
    expect(screen.getByRole('listbox', { name: 'Selling rates' })).toBeTruthy();
  });

  it('pickSendsTheOptionValue', () => {
    const { onPick } = setup(rates(LEGACY_RATE, RULE_RATE));
    pick('Rate-A · 83.64/unit + GST · PTR less 8%, 10+1');
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith('rate:Rate-A');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('calls onOpen when opened, e.g. to load the batch rates', () => {
    const { onOpen } = setup(rates(LEGACY_RATE));
    openPicker();
    expect(onOpen).toHaveBeenCalledTimes(1);
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

    pick('Rate-A · 83.64/unit + GST · PTR less 8%, 10+1');
    expect(trigger().textContent).toBe('Rate: Rate-A · 83.64/unit + GST · PTR less 8%, 10+1');
    expect(screen.getByLabelText('line terms').textContent).toBe('10 less 8%');

    pick('PTR · ₹100.00');
    expect(sent).toEqual([{ rateName: 'Rate-A' }, { rateName: 'priceToRetail' }]);
    expect(trigger().textContent).toBe('Rate: PTR · ₹100.00');
    expect(screen.getByLabelText('line terms').textContent).toBe('10 less 0%');
  });

  it('does not pick the option already shown', () => {
    const { onPick } = setup(rates(RULE_RATE), 'rate:Rate-A');
    pick('Rate-A · 83.64/unit + GST · PTR less 8%, 10+1');
    expect(onPick).not.toHaveBeenCalled();
  });

  it('optionLabelUsesApiTerms', () => {
    setup(rates(RULE_RATE));
    expect(optionLabels()).toContain('Rate-A · 83.64/unit + GST · PTR less 8%, 10+1');
  });

  it('labels an inclusive rate incl. GST', () => {
    setup(rates({ ...RULE_RATE, gstMode: 'INCLUSIVE' }));
    expect(optionLabels()).toContain('Rate-A · 83.64/unit incl. GST · PTR less 8%, 10+1');
  });

  it('legacyAndSystemOptionsKeepMainsListLabel', () => {
    setup({ maximumRetailPrice: 120, rates: [LEGACY_RATE] }, undefined, 'list');
    expect(optionLabels()).toEqual(['MRP · ₹120.00', 'Wholesale · ₹90.00']);
  });

  it('legacyAndSystemOptionsKeepMainsGridLabel', () => {
    setup({ priceToRetail: 100, rates: [LEGACY_RATE] }, undefined, 'grid');
    expect(optionLabels()).toEqual(['PTR (₹100.00)', 'Wholesale (₹90.00)']);
  });

  it('ruleRateUsesTermsLabelInBothLayouts', () => {
    setup(rates(RULE_RATE), undefined, 'grid');
    expect(optionLabels()).toContain('Rate-A · 83.64/unit + GST · PTR less 8%, 10+1');
  });

  it('shows the given value and marks it chosen', () => {
    setup(rates(LEGACY_RATE, RULE_RATE), 'rate:Rate-A');
    expect(trigger().textContent).toBe('Rate: Rate-A · 83.64/unit + GST · PTR less 8%, 10+1');
    openPicker();
    expect(
      screen
        .getByRole('option', { name: 'Rate-A · 83.64/unit + GST · PTR less 8%, 10+1' })
        .getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('falls back to Custom without a value, and does not offer it', () => {
    setup(rates(LEGACY_RATE));
    expect(trigger().textContent).toBe('Rate: Custom');
    expect(optionLabels()).not.toContain('Custom');
  });

  it('says so while the rates load', () => {
    render(<RatePicker options={[]} onPick={vi.fn()} layout="list" loading />);
    expect(trigger().textContent).toBe('Rate: Loading rates…');
  });
});
