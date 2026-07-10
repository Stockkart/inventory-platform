import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from './Spinner';
import { Toast } from './Alert';
import { Stack, Text } from '../layout';

const meta: Meta<typeof Spinner> = {
  title: 'Feedback/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
  },
  args: { size: 'md' },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Playground: Story = {
  render: (args) => (
    <Stack gap="sm" align="center">
      <Spinner {...args} />
      <Text variant="caption" color="secondary">
        size={args.size}
      </Text>
    </Stack>
  ),
};

export const ToastPlayground: StoryObj<typeof Toast> = {
  name: 'Toast / Playground',
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'success', 'error', 'warning'],
    },
    message: { control: 'text' },
  },
  args: {
    variant: 'success',
    message: 'Vendor updated successfully.',
  },
  render: (args) => (
    <div style={{ width: 360 }}>
      <Toast {...args} />
    </div>
  ),
};
