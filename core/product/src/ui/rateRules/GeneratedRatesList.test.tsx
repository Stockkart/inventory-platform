import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { PricingRate } from '@inventory-platform/contracts';
import { GeneratedRatesList } from './GeneratedRatesList';

const RULE_RATE: PricingRate = {
  name: 'Rate-A',
  price: 83.64,
  base: 'priceToRetail',
  baseValue: 100,
  discountPercent: 5,
  scheme: null,
  manual: false,
  gstMode: 'EXCLUSIVE',
  termsText: 'PTR less 5% plus GST',
};

function setup(
  props: Partial<React.ComponentProps<typeof GeneratedRatesList>> = {},
  rates: PricingRate[] = [RULE_RATE],
) {
  const onEditTerms = vi.fn();
  const onReset = vi.fn();
  render(
    <GeneratedRatesList
      rates={rates}
      canEdit
      onEditTerms={onEditTerms}
      onReset={onReset}
      {...props}
    />,
  );
  return { onEditTerms, onReset };
}

describe('GeneratedRatesList', () => {
  it('noEditControlsWithoutCanEdit', () => {
    setup({ canEdit: false }, [{ ...RULE_RATE, manual: true }]);
    expect(screen.queryByLabelText('Discount %')).toBeNull();
    expect(screen.queryByLabelText('Scheme')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('editChangesTermsNotPrice', () => {
    const { onEditTerms } = setup();
    // No price input for a rule rate.
    expect(screen.queryByLabelText(/price/i)).toBeNull();
    const discount = screen.getByLabelText('Discount %');
    fireEvent.change(discount, { target: { value: '7' } });
    fireEvent.blur(discount);
    expect(onEditTerms).toHaveBeenCalledWith('Rate-A', { discountPercent: 7, scheme: null });
  });

  it('showsOverriddenMarker', () => {
    setup({}, [{ ...RULE_RATE, manual: true }]);
    expect(screen.getByText('overridden')).toBeTruthy();
  });

  it('marksManualRates only when manual', () => {
    setup({}, [RULE_RATE]);
    expect(screen.queryByText('overridden')).toBeNull();
  });

  it('showsTermsTextAndGstLabel', () => {
    setup({}, [
      RULE_RATE,
      { ...RULE_RATE, name: 'Rate-B', gstMode: 'INCLUSIVE', termsText: 'MRP less 10% incl GST' },
    ]);
    expect(screen.getByText('PTR less 5% plus GST')).toBeTruthy();
    expect(screen.getByText(/83\.64 \+ GST/)).toBeTruthy();
    expect(screen.getByText(/83\.64 incl\. GST/)).toBeTruthy();
  });

  it('showsBelowCostSkippedMessage', () => {
    setup(
      {
        skipped: [{ name: 'Rate-C', reason: 'BELOW_COST' }],
        warnings: [{ name: 'Rate-D', reason: 'BELOW_COST' }],
      },
      [],
    );
    expect(screen.getByText('Rate-C not generated: below cost')).toBeTruthy();
    expect(screen.getByText('Rate-D is below cost')).toBeTruthy();
  });

  it('resetCallsOnReset', () => {
    const { onReset } = setup({}, [{ ...RULE_RATE, manual: true }]);
    fireEvent.click(screen.getByRole('button', { name: 'Reset Rate-A to rule' }));
    expect(onReset).toHaveBeenCalledWith('Rate-A');
  });

  it('offers no reset on a rate that is not overridden', () => {
    setup();
    expect(screen.queryByRole('button', { name: /Reset/ })).toBeNull();
  });

  it('refuses to clear a scheme and says so', () => {
    const { onEditTerms } = setup({}, [
      { ...RULE_RATE, scheme: { schemeType: 'PERCENTAGE', schemePercentage: 2 } },
    ]);
    expect(screen.getByText(/can.t be removed by override/)).toBeTruthy();
    const input = screen.getByLabelText('Scheme') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(onEditTerms).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Scheme') as HTMLInputElement).value).toBe('2%');
  });

  it('refuses to clear the discount', () => {
    const { onEditTerms } = setup();
    const discount = screen.getByLabelText('Discount %') as HTMLInputElement;
    fireEvent.change(discount, { target: { value: '' } });
    fireEvent.blur(discount);
    expect(onEditTerms).not.toHaveBeenCalled();
    expect(discount.value).toBe('5');
  });
});
