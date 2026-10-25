import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MonthPicker } from './MonthPicker';
import { Stack, Text } from '../layout';

const meta: Meta<typeof MonthPicker> = {
  title: 'Patterns/MonthPicker',
  component: MonthPicker,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Choose a month (value `YYYY-MM`). Previous / next buttons step one month; the middle button opens a grid of 12 months. Arrow keys move, Page Up / Page Down change the year, Escape closes.',
      },
    },
  },
  argTypes: {
    onChange: { action: 'change', table: { disable: true } },
  },
  args: {
    value: '2026-10',
    label: 'Pay month',
    min: '2025-04',
    max: '2026-12',
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof MonthPicker>;

export const Playground: Story = {
  render: function PlaygroundStory(args) {
    const [value, setValue] = useState(args.value);
    return (
      <Stack gap="md">
        <MonthPicker
          {...args}
          value={value}
          onChange={(next) => {
            setValue(next);
            args.onChange?.(next);
          }}
        />
        <Text variant="caption" color="secondary">
          Selected: {value}
        </Text>
      </Stack>
    );
  },
};
