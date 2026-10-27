import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';
import { FormField } from './FormField';
import { Stack } from '../layout';

const meta: Meta<typeof Select> = {
  title: 'Forms/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'The StockKart dropdown. Never a native select: a field-styled button that opens the ChoiceList in a panel (check mark on the chosen option, arrow keys, Escape). Keeps the native props: value, onChange with event.target.value, options or <option> children.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Select>;

const BASES = [
  { value: 'priceToRetail', label: 'PTR' },
  { value: 'maximumRetailPrice', label: 'MRP' },
];

function Controlled({ hasError, disabled }: { hasError?: boolean; disabled?: boolean }) {
  const [base, setBase] = useState('priceToRetail');
  return (
    <Stack gap="md" style={{ width: '16rem' }}>
      <FormField label="Base" id="story-base">
        <Select
          id="story-base"
          options={BASES}
          value={base}
          hasError={hasError}
          disabled={disabled}
          onChange={(e) => setBase(e.target.value)}
        />
      </FormField>
      <FormField label="Unit" id="story-unit">
        <Select id="story-unit" defaultValue="TAB">
          <option value="TAB">TAB (base)</option>
          <option value="PAC">PAC</option>
        </Select>
      </FormField>
    </Stack>
  );
}

export const Default: Story = { render: () => <Controlled /> };

export const WithError: Story = { render: () => <Controlled hasError /> };

export const Disabled: Story = { render: () => <Controlled disabled /> };
