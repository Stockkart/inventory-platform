import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DateStepper } from './DateStepper';
import { Stack, Text } from '../layout';

const meta: Meta<typeof DateStepper> = {
  title: 'Patterns/DateStepper',
  component: DateStepper,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Day chooser for day-by-day screens (value `yyyy-MM-dd`): Previous day, a date box, Next day and Today. `max` stops people moving into the future.',
      },
    },
  },
  argTypes: {
    onChange: { action: 'change', table: { disable: true } },
  },
  args: {
    value: '2026-10-20',
    today: '2026-10-24',
    max: '2026-10-24',
    label: 'Attendance date',
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof DateStepper>;

export const Playground: Story = {
  render: function PlaygroundStory(args) {
    const [value, setValue] = useState(args.value);
    return (
      <Stack gap="md">
        <DateStepper
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
