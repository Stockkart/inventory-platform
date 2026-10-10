import { useState } from 'react';
import type { MenuSection } from '@inventory-platform/plugin-cafe/types';
import { Input, Select, Stack } from '@inventory-platform/ui-kit';

const NEW_STATION = '__new__';
const NO_TICKET = 'NONE';
const KITCHEN = 'KITCHEN';

/** Stations the menu already routes to, uppercased and once each. Kitchen and No ticket are fixed options. */
export function stationsInMenu(sections: MenuSection[]): string[] {
  const found = new Set<string>();
  for (const section of sections) {
    for (const item of section.items ?? []) {
      const station = (item.department ?? '').trim().toUpperCase();
      if (station && station !== KITCHEN && station !== NO_TICKET) found.add(station);
    }
  }
  return [...found].sort();
}

export interface StationSelectProps {
  /** Stored department; blank means the default kitchen. */
  value: string;
  knownStations: string[];
  onChange: (next: string) => void;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}

/**
 * Where an item's KOT goes. "No ticket" is a real station (`NONE`): the item is billed and its
 * stock goes down, but nothing prints — a bottle from the counter fridge.
 */
export function StationSelect({
  value,
  knownStations,
  onChange,
  disabled,
  id,
  ariaLabel = 'Station',
}: StationSelectProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const current = (value ?? '').trim().toUpperCase();
  const selected = adding ? NEW_STATION : current === KITCHEN ? '' : current;

  const options = [
    { value: '', label: 'Kitchen' },
    ...knownStations.map((station) => ({ value: station, label: station })),
    { value: NO_TICKET, label: 'No ticket' },
    { value: NEW_STATION, label: 'New station…' },
  ];

  const commitDraft = () => {
    const next = draft.trim().toUpperCase();
    if (next) onChange(next);
    setAdding(false);
    setDraft('');
  };

  return (
    <Stack gap="xs" width="full">
      <Select
        id={id}
        aria-label={ariaLabel}
        value={selected}
        disabled={disabled}
        options={options}
        onChange={(e) => {
          if (e.target.value === NEW_STATION) {
            setAdding(true);
            return;
          }
          setAdding(false);
          onChange(e.target.value);
        }}
      />
      {adding ? (
        <Input
          autoFocus
          value={draft}
          placeholder="Station name"
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitDraft();
          }}
        />
      ) : null}
    </Stack>
  );
}
