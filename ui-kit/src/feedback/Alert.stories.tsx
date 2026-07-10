import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'Feedback/Alert',
  component: Alert,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Inline status message for page-level feedback. Use Controls to switch variants.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'danger'],
      description: 'Semantic tone',
      table: { defaultValue: { summary: 'info' } },
    },
    children: {
      control: 'text',
      description: 'Message content',
    },
    role: {
      control: 'inline-radio',
      options: ['alert', 'status'],
    },
  },
  args: {
    variant: 'info',
    children: 'Inventory sync completed successfully.',
    role: 'alert',
  },
};

export default meta;
type Story = StoryObj<typeof Alert>;

/** Live Controls playground. */
export const Playground: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
};

export const AllVariants: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 420 }}>
      <Alert variant="info">Sync completed.</Alert>
      <Alert variant="success">Vendor saved.</Alert>
      <Alert variant="warning">3 items below threshold.</Alert>
      <Alert variant="danger">Failed to save changes.</Alert>
    </div>
  ),
};
