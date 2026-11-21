import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChoiceList, FilterDropdown } from './FacetFilter';
import { Box } from '../layout';

const meta: Meta<typeof FilterDropdown> = {
  title: 'Patterns/FilterDropdown',
  component: FilterDropdown,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A button that opens a small panel (Product Search filters and sort). `block` fills its container with field corners, for a picker in a form row (Scan & Sell rate).',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof FilterDropdown>;

const OPTIONS = [
  { value: 'system:maximumRetailPrice', label: 'MRP · ₹300.00' },
  { value: 'system:priceToRetail', label: 'PTR · ₹120.00' },
  { value: 'rate:PTR-rate', label: 'PTR-rate · 108.30/unit + GST · PTR 120.00 – 5% · 19+1' },
];

function Picker({ block }: { block?: boolean }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('system:priceToRetail');
  return (
    <FilterDropdown
      block={block}
      label="Rate"
      value={OPTIONS.find((o) => o.value === value)?.label}
      panelTitle="Selling rate"
      open={open}
      onOpenChange={setOpen}
    >
      <ChoiceList
        aria-label="Selling rates"
        options={OPTIONS}
        value={value}
        onChange={(next) => {
          setValue(next);
          setOpen(false);
        }}
      />
    </FilterDropdown>
  );
}

export const Pill: Story = {
  render: () => <Picker />,
};

export const Block: Story = {
  render: () => (
    <Box style={{ width: 420 }}>
      <Picker block />
    </Box>
  ),
};
