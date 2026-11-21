// Feature: advanced-product-search — Scan & Sell company chips (R7.2, R7.3, R7.5)
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import fc from 'fast-check';
import type { FacetValue } from '../../model/search.types';
import {
  COMPANY_CHIP_LIMIT,
  CompanyChips,
  chipIndexForKey,
  visibleCompanyChips,
} from './CompanyChips';

const facet = (value: string, count: number): FacetValue => ({ value, label: value, count });

describe('visibleCompanyChips', () => {
  it('hides the chips when every result is from one company', () => {
    expect(visibleCompanyChips([facet('Cipla', 7)])).toEqual([]);
    expect(visibleCompanyChips([facet('Cipla', 7), facet('GSK', 0)])).toEqual([]);
    expect(visibleCompanyChips([])).toEqual([]);
  });

  it('offers at most five, biggest first, never a zero', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.record({ value: fc.string({ minLength: 1 }), count: fc.nat(100) }), {
          selector: (c) => c.value,
          maxLength: 12,
        }),
        (companies) => {
          const chips = visibleCompanyChips(companies.map((c) => facet(c.value, c.count)));
          expect(chips.length).toBeLessThanOrEqual(COMPANY_CHIP_LIMIT);
          expect(chips.every((c) => c.count > 0)).toBe(true);
          for (let i = 1; i < chips.length; i++)
            expect(chips[i - 1].count).toBeGreaterThanOrEqual(chips[i].count);
          const positive = companies.filter((c) => c.count > 0).length;
          expect(chips.length).toBe(positive < 2 ? 0 : Math.min(positive, COMPANY_CHIP_LIMIT));
        },
      ),
    );
  });
});

describe('chipIndexForKey', () => {
  it('needs Alt and a digit 1–5; plain digits are left for typing', () => {
    expect(chipIndexForKey({ key: '1', altKey: true, ctrlKey: false, metaKey: false })).toBe(0);
    expect(chipIndexForKey({ key: '5', altKey: true, ctrlKey: false, metaKey: false })).toBe(4);
    expect(chipIndexForKey({ key: '6', altKey: true, ctrlKey: false, metaKey: false })).toBeNull();
    expect(chipIndexForKey({ key: '0', altKey: true, ctrlKey: false, metaKey: false })).toBeNull();
    expect(chipIndexForKey({ key: '2', altKey: false, ctrlKey: false, metaKey: false })).toBeNull();
    expect(chipIndexForKey({ key: '2', altKey: true, ctrlKey: true, metaKey: false })).toBeNull();
  });
});

describe('<CompanyChips>', () => {
  const companies = [facet('Cipla', 3), facet('GSK', 2), facet('Sun', 1)];

  it('renders All plus one chip per company with its count, and selects on click', () => {
    const onSelect = vi.fn();
    render(<CompanyChips companies={companies} selected={null} onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /GSK/ }));
    expect(onSelect).toHaveBeenCalledWith('GSK');
    expect(screen.getByRole('button', { name: /Cipla/ }).textContent).toContain('3');
  });

  it('clicking the chosen company again, or All, goes back to all companies', () => {
    const onSelect = vi.fn();
    render(<CompanyChips companies={companies} selected="GSK" onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: /GSK/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /GSK/ }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it('renders nothing with a single company and no selection', () => {
    const { container } = render(
      <CompanyChips companies={[facet('Cipla', 3)]} selected={null} onSelect={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
