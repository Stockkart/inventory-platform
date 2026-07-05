import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FormField } from './FormField';
import { Input } from './Input';
import { Select } from './Select';

const meta: Meta<typeof FormField> = {
  title: 'Forms/FormField',
  component: FormField,
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const LegacyControlled: Story = {
  render: function LegacyControlledStory() {
    const [value, setValue] = useState('Acme Supplies');
    return (
      <FormField
        label="Vendor name"
        value={value}
        onChange={setValue}
        required
        hint="Legal name as on invoices"
      />
    );
  },
};

export const WithError: Story = {
  render: () => (
    <FormField
      label="Email"
      type="email"
      value="not-an-email"
      error="Enter a valid email address"
    />
  ),
};

export const WithChildrenSlot: Story = {
  render: function SlotStory() {
    const [role, setRole] = useState('manager');
    return (
      <FormField label="Role" hint="Controls dashboard access">
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="owner">Owner</option>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
        </Select>
      </FormField>
    );
  },
};

export const CustomControl: Story = {
  render: () => (
    <FormField label="SKU" error="Required">
      <Input placeholder="Scan or type barcode" hasError />
    </FormField>
  ),
};
