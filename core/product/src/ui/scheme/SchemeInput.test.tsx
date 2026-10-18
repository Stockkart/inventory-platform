import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SchemeInput } from './SchemeInput';

function setup(props: Partial<React.ComponentProps<typeof SchemeInput>> = {}) {
  const onCommitUnits = vi.fn();
  const onCommitPercentage = vi.fn();
  render(
    <SchemeInput
      schemeType={null}
      payFor={null}
      free={null}
      percentage={null}
      onCommitUnits={onCommitUnits}
      onCommitPercentage={onCommitPercentage}
      disabled={false}
      {...props}
    />,
  );
  return {
    input: screen.getByRole('textbox') as HTMLInputElement,
    onCommitUnits,
    onCommitPercentage,
  };
}

describe('SchemeInput', () => {
  it('switchesBetweenUnitsAndPercent', () => {
    const { input, onCommitUnits, onCommitPercentage } = setup({
      schemeType: 'FIXED_UNITS',
      payFor: 10,
      free: 1,
    });
    expect(input.value).toBe('10 + 1');

    fireEvent.change(input, { target: { value: '5%' } });
    fireEvent.blur(input);
    expect(onCommitPercentage).toHaveBeenLastCalledWith(5);
    expect(onCommitUnits).not.toHaveBeenCalled();

    // plain number is treated as a percentage and clears units
    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.blur(input);
    expect(onCommitUnits).toHaveBeenLastCalledWith(null, null);
    expect(onCommitPercentage).toHaveBeenLastCalledWith(7);

    // mixing '+' and '%' is rejected by the input filter
    fireEvent.change(input, { target: { value: '5+1%' } });
    expect(input.value).toBe('7');
  });

  it('showsPercentWhenSchemeTypeIsPercentage', () => {
    const { input } = setup({ schemeType: 'PERCENTAGE', percentage: 12, payFor: 10, free: 1 });
    expect(input.value).toBe('12%');
  });

  it('emitsPayForAndFree', () => {
    const { input, onCommitUnits, onCommitPercentage } = setup();
    fireEvent.change(input, { target: { value: '10+1' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommitUnits).toHaveBeenCalledWith(10, 1);
    expect(onCommitPercentage).not.toHaveBeenCalled();
  });

  it('clearsBothWhenEmptied', () => {
    const { input, onCommitUnits, onCommitPercentage } = setup({
      schemeType: 'PERCENTAGE',
      percentage: 5,
    });
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(onCommitUnits).toHaveBeenCalledWith(null, null);
    expect(onCommitPercentage).toHaveBeenCalledWith(null);
  });
});
