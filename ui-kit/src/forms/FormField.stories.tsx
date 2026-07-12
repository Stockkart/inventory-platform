import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FormField, type LegacyFormFieldProps } from './FormField';
import { Input } from './Input';
import { Select } from './Select';
import { Stack, Text } from '../layout';

/**
 * Field wrapper with label, hint, and error. Two APIs:
 * 1. **Legacy controlled** — pass `value` / `onChange` (renders Input or Textarea).
 * 2. **Slot** — pass `children` (Select, custom Input, etc.).
 *
 * Use **Playground** + Controls to explore the legacy API.
 */
const meta: Meta<LegacyFormFieldProps> = {
  title: 'Forms/FormField',
  component: FormField,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Labeled form control with optional hint and error. Prefer the Playground story and the Controls panel to try props.',
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Visible field label',
      table: { category: 'Content' },
    },
    value: {
      control: 'text',
      description: 'Controlled input value (legacy API)',
      table: { category: 'Content' },
    },
    placeholder: {
      control: 'text',
      table: { category: 'Content' },
    },
    hint: {
      control: 'text',
      description: 'Helper text under the control',
      table: { category: 'Content' },
    },
    error: {
      control: 'text',
      description: 'Validation message (sets invalid styles)',
      table: { category: 'Validation' },
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'tel', 'password', 'number'],
      table: { category: 'Input' },
    },
    required: {
      control: 'boolean',
      table: { category: 'Validation' },
    },
    disabled: {
      control: 'boolean',
      table: { category: 'State' },
    },
    readOnly: {
      control: 'boolean',
      table: { category: 'State' },
    },
    multiline: {
      control: 'boolean',
      description: 'Render a textarea instead of input',
      table: { category: 'Input' },
    },
    rows: {
      control: { type: 'number', min: 2, max: 12 },
      if: { arg: 'multiline' },
      table: { category: 'Input' },
    },
    onChange: {
      action: 'changed',
      table: { disable: true },
    },
  },
  args: {
    label: 'Vendor name',
    value: 'Acme Supplies',
    placeholder: 'Enter vendor name',
    hint: 'Legal name as on invoices',
    error: '',
    type: 'text',
    required: true,
    disabled: false,
    readOnly: false,
    multiline: false,
    rows: 3,
  },
};

export default meta;
type Story = StoryObj<LegacyFormFieldProps>;

/** Interactive controls — change props in the Controls panel below. */
export const Playground: Story = {
  render: function PlaygroundStory(args) {
    const [value, setValue] = useState(args.value ?? '');
    return (
      <Stack gap="md" style={{ width: 360 }}>
        <FormField
          {...args}
          value={value}
          onChange={(next) => {
            setValue(next);
            args.onChange?.(next);
          }}
          error={args.error || undefined}
          hint={args.hint || undefined}
        />
        <Text variant="caption" color="secondary">
          Tip: toggle <strong>required</strong>, set an <strong>error</strong>, or enable{' '}
          <strong>multiline</strong> in Controls.
        </Text>
      </Stack>
    );
  },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    type: 'email',
    value: 'not-an-email',
    hint: '',
    error: 'Enter a valid email address',
    required: true,
  },
};

export const Multiline: Story = {
  args: {
    label: 'Notes',
    value: 'Deliver after 2pm',
    multiline: true,
    rows: 4,
    hint: 'Shown on the purchase order',
    required: false,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Shop ID',
    value: 'shop_abc123',
    disabled: true,
    required: false,
    hint: 'Assigned by the system',
  },
};

export const WithChildrenSlot: Story = {
  name: 'Slot API (Select)',
  parameters: {
    docs: {
      description: {
        story: 'Pass `children` instead of `value` to wrap any control (Select, custom Input, …).',
      },
    },
  },
  render: function SlotStory() {
    const [role, setRole] = useState('manager');
    return (
      <Stack gap="md" style={{ width: 360 }}>
        <FormField label="Role" hint="Controls dashboard access" required>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </Select>
        </FormField>
      </Stack>
    );
  },
};

export const CustomControl: Story = {
  name: 'Slot API (Input + error)',
  render: () => (
    <Stack style={{ width: 360 }}>
      <FormField label="SKU" error="Required" required>
        <Input placeholder="Scan or type barcode" hasError />
      </FormField>
    </Stack>
  ),
};
