import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PermissionGrid } from './PermissionGrid';

type Role = 'ADMIN' | 'MANAGER' | 'CASHIER';
type Permission = 'VIEW_ATTENDANCE' | 'MARK_ATTENDANCE' | 'VIEW_SALARIES' | 'RUN_PAYROLL';

const ROLES = [
  { id: 'ADMIN', label: 'Admin' },
  { id: 'MANAGER', label: 'Manager' },
  { id: 'CASHIER', label: 'Cashier' },
] as const;

const PERMISSIONS = [
  { id: 'VIEW_ATTENDANCE', label: 'See attendance', description: 'Daily and monthly registers' },
  { id: 'MARK_ATTENDANCE', label: 'Mark attendance' },
  { id: 'VIEW_SALARIES', label: 'See salaries', description: 'Pay, deductions and advances' },
  { id: 'RUN_PAYROLL', label: 'Run payroll' },
] as const;

const meta: Meta<typeof PermissionGrid<Role, Permission>> = {
  title: 'Patterns/PermissionGrid',
  component: PermissionGrid,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Checkbox matrix of permissions (rows) × roles (columns). Row and column headers are `th` cells, the first column stays put when the grid scrolls sideways, and single cells can be locked with `isCellDisabled`.',
      },
    },
  },
  args: {
    caption: 'Who can do what in HR',
    showCaption: true,
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof PermissionGrid<Role, Permission>>;

export const Playground: Story = {
  render: function PlaygroundStory(args) {
    const [value, setValue] = useState<Partial<Record<Role, Permission[]>>>({
      ADMIN: ['VIEW_ATTENDANCE', 'MARK_ATTENDANCE', 'VIEW_SALARIES', 'RUN_PAYROLL'],
      MANAGER: ['VIEW_ATTENDANCE', 'MARK_ATTENDANCE'],
      CASHIER: [],
    });
    return (
      <PermissionGrid<Role, Permission>
        {...args}
        roles={ROLES}
        permissions={PERMISSIONS}
        value={value}
        // Example lock: running payroll needs "See salaries", so that box is locked while ticked.
        isCellDisabled={(role, permission) =>
          permission === 'VIEW_SALARIES' && (value[role] ?? []).includes('RUN_PAYROLL')
        }
        onChange={(role, permission, checked) =>
          setValue((prev) => {
            const current = prev[role] ?? [];
            return {
              ...prev,
              [role]: checked ? [...current, permission] : current.filter((p) => p !== permission),
            };
          })
        }
      />
    );
  },
};
