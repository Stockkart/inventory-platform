import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { QtyStepper } from './QtyStepper';
import { CartQtyStepper } from './CartQtyStepper';
import { Stack, Text } from '../layout';

const meta: Meta<typeof QtyStepper> = {
  title: 'Patterns/QtyStepper',
  component: QtyStepper,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Increment / decrement quantity control used in Scan & Sell cart lines. Use Controls on Playground.',
      },
    },
  },
  argTypes: {
    value: { control: 'text', description: 'Displayed value' },
    disabled: { control: 'boolean' },
    decrementDisabled: { control: 'boolean' },
    incrementDisabled: { control: 'boolean' },
    decrementLabel: { control: 'text' },
    incrementLabel: { control: 'text' },
    onDecrement: { action: 'decrement', table: { disable: true } },
    onIncrement: { action: 'increment', table: { disable: true } },
    onChange: { action: 'change', table: { disable: true } },
  },
  args: {
    value: '2',
    disabled: false,
    decrementDisabled: false,
    incrementDisabled: false,
    decrementLabel: '−',
    incrementLabel: '+',
  },
};

export default meta;
type Story = StoryObj<typeof QtyStepper>;

export const Playground: Story = {
  render: function PlaygroundStory(args) {
    const [value, setValue] = useState(Number(args.value) || 1);
    return (
      <Stack gap="md" style={{ width: 280 }}>
        <QtyStepper
          {...args}
          value={value}
          decrementDisabled={args.decrementDisabled || value <= 1}
          onDecrement={() => {
            setValue((v) => Math.max(1, v - 1));
            args.onDecrement?.();
          }}
          onIncrement={() => {
            setValue((v) => v + 1);
            args.onIncrement?.();
          }}
          onChange={(e) => setValue(Number(e.target.value) || 1)}
        />
        <Text variant="caption" color="secondary">
          Current value: {value}
        </Text>
      </Stack>
    );
  },
};

export const CartCommit: StoryObj<typeof CartQtyStepper> = {
  name: 'CartQtyStepper (commit on blur)',
  parameters: {
    docs: {
      description: {
        story: 'Drafts while typing; commits on blur or Enter — used in POS cart lines.',
      },
    },
  },
  render: function CartCommitStory() {
    const [value, setValue] = useState(2);
    const [log, setLog] = useState('Edit then blur / Enter');
    return (
      <Stack gap="md" style={{ width: 300 }}>
        <CartQtyStepper
          value={value}
          onDecrement={() => setValue((v) => Math.max(1, v - 1))}
          onIncrement={() => setValue((v) => v + 1)}
          onCommit={(next) => {
            setValue(next);
            setLog(`Committed qty ${next}`);
          }}
        />
        <Text variant="caption" color="secondary">
          {log}
        </Text>
      </Stack>
    );
  },
};
