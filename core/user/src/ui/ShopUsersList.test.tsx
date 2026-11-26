// Feature: worker-app, R2.4, R2.5: the Users page lists WORKER logins in a "Workers" group below
// the staff, with name, e-mail and the linked employee's code, no role to set, and outside the
// team's seat figure.
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ShopUser } from '../model/party.types';
import { ShopUsersList, splitShopUsers } from './ShopUsersList';

const invitationsApi = vi.hoisted(() => ({ getShopUsers: vi.fn() }));
vi.mock('../api/invitations.api', () => ({ invitationsApi }));

function staff(name: string, role: string, extra: Partial<ShopUser> = {}): ShopUser {
  return {
    userId: `u-${name}`,
    name,
    email: `${name.toLowerCase()}@shop.in`,
    role,
    relationship: role === 'OWNER' ? 'OWNER' : 'INVITED',
    active: true,
    joinedAt: '2024-01-05T00:00:00Z',
    ...extra,
  };
}

// Worker rows arrive as the backend `UserDto` sends them: no relationship or join date.
function worker(name: string, linkedEmployeeCode: string | null, active = true): ShopUser {
  return {
    userId: `w-${name}`,
    name,
    email: `${name.toLowerCase()}@gmail.com`,
    role: 'WORKER',
    relationship: null,
    active,
    joinedAt: null,
    ...(linkedEmployeeCode ? { linkedEmployeeCode } : {}),
  };
}

const USERS: ShopUser[] = [
  staff('Ramesh', 'OWNER'),
  worker('Priya', 'EMP-015'),
  staff('Anita', 'MANAGER'),
  staff('Suresh', 'CASHIER', { active: false }),
  worker('Ravi', null, false),
];

describe('splitShopUsers', () => {
  it('puts WORKER rows in the workers group and every other role in the staff group', () => {
    const { staff: team, workers } = splitShopUsers(USERS);
    expect(team.map((u) => u.name)).toEqual(['Ramesh', 'Anita', 'Suresh']);
    expect(workers.map((u) => u.name)).toEqual(['Priya', 'Ravi']);
  });
});

describe('ShopUsersList', () => {
  it('shows the Workers group below the team with name, e-mail and employee code', async () => {
    invitationsApi.getShopUsers.mockResolvedValue(USERS);
    render(<ShopUsersList shopId="shop-1" />);

    const team = await screen.findByRole('table', { name: 'Team' });
    const workers = screen.getByRole('table', { name: 'Workers' });
    expect(team.compareDocumentPosition(workers) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(screen.getByRole('heading', { name: /^Workers · 2$/ })).toBeInTheDocument();
    const rows = within(workers).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Priya')).toBeInTheDocument();
    expect(within(rows[0]).getByText('priya@gmail.com')).toBeInTheDocument();
    expect(within(rows[0]).getByText('EMP-015')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Active')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Ravi')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Not linked')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Inactive')).toBeInTheDocument();

    // Workers are not in the team table and have no role column or role control (R2.4).
    expect(within(team).queryByText('Priya')).not.toBeInTheDocument();
    expect(within(workers).queryByText('Role')).not.toBeInTheDocument();
    expect(within(workers).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(workers).queryByRole('button')).not.toBeInTheDocument();
  });

  it('counts only staff in the team figure', async () => {
    invitationsApi.getShopUsers.mockResolvedValue(USERS);
    render(<ShopUsersList shopId="shop-1" />);
    expect(
      await screen.findByRole('heading', { name: 'Team · 3 total · 1 owner · 2 active' }),
    ).toBeInTheDocument();
  });

  it('renders no Workers group when the shop has none', async () => {
    invitationsApi.getShopUsers.mockResolvedValue([staff('Ramesh', 'OWNER')]);
    render(<ShopUsersList shopId="shop-1" />);
    await screen.findByRole('table', { name: 'Team' });
    expect(screen.queryByRole('table', { name: 'Workers' })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Workers/)).not.toBeInTheDocument();
  });
});
