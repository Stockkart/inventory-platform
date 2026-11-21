/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StationSelect, stationsInMenu } from './StationSelect';

afterEach(() => {
  cleanup();
});

/** The ui-kit Select is a button that opens a listbox; its options exist only while it is open. */
function openStations() {
  fireEvent.click(screen.getByRole('button', { name: 'Station' }));
}

function pick(label: string) {
  openStations();
  fireEvent.click(screen.getByRole('option', { name: label }));
}

describe('StationSelect', () => {
  it('offers Kitchen, the menu stations, and No ticket', () => {
    render(<StationSelect value="" knownStations={['BAR', 'TANDOOR']} onChange={vi.fn()} />);
    openStations();
    const labels = screen.getAllByRole('option').map((o) => o.textContent);
    expect(labels).toEqual(['Kitchen', 'BAR', 'TANDOOR', 'No ticket', 'New station…']);
  });

  it('emits NONE for No ticket', () => {
    const onChange = vi.fn();
    render(<StationSelect value="" knownStations={[]} onChange={onChange} />);
    pick('No ticket');
    expect(onChange).toHaveBeenCalledWith('NONE');
  });

  it('takes a new station typed by hand, uppercased', () => {
    const onChange = vi.fn();
    render(<StationSelect value="" knownStations={[]} onChange={onChange} />);
    pick('New station…');
    const input = screen.getByPlaceholderText('Station name');
    fireEvent.change(input, { target: { value: ' counter ' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith('COUNTER');
  });

  it('collects stations from every item, uppercased, once each', () => {
    expect(
      stationsInMenu([
        {
          id: 's',
          title: 'A',
          items: [
            { id: '1', name: 'a', sellingPrice: 1, sellMode: 'menu', department: 'bar' },
            { id: '2', name: 'b', sellingPrice: 1, sellMode: 'menu', department: 'BAR ' },
            { id: '3', name: 'c', sellingPrice: 1, sellMode: 'menu', department: 'NONE' },
            { id: '4', name: 'd', sellingPrice: 1, sellMode: 'menu', department: 'kitchen' },
          ],
        },
      ]),
    ).toEqual(['BAR']);
  });
});
