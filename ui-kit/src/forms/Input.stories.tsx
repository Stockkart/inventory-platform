import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';
import { Stack, Text } from '../layout';

const meta: Meta<typeof Input> = {
  title: 'Forms/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Text input primitive. Pair with FormField for label / hint / error.',
      },
    },
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'tel', 'password', 'number', 'search'],
    },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    hasError: {
      control: 'boolean',
      description: 'Invalid / error border style',
    },
    readOnlyStyle: {
      control: 'boolean',
      description: 'Muted read-only appearance',
    },
    defaultValue: { control: 'text' },
    onChange: { action: 'changed', table: { disable: true } },
  },
  args: {
    type: 'text',
    placeholder: 'Type here…',
    disabled: false,
    readOnly: false,
    hasError: false,
    readOnlyStyle: false,
    defaultValue: '',
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Playground: Story = {
  render: (args) => (
    <Stack gap="sm" style={{ width: 320 }}>
      <Text variant="label">Product name</Text>
      <Input {...args} />
    </Stack>
  ),
};

export const WithError: Story = {
  args: {
    hasError: true,
    defaultValue: 'bad',
    placeholder: 'Required',
  },
};

export const ReadOnly: Story = {
  args: {
    readOnly: true,
    readOnlyStyle: true,
    defaultValue: 'INV-20481',
  },
};
