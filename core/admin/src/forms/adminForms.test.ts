import { describe, expect, it } from 'vitest';
import type { AdminAccount } from '@inventory-platform/admin/types';
import {
  adminStatusBadge,
  toChangePasswordRequest,
  toCreateAdminRequest,
  toLoginRequest,
} from './adminForms';

describe('toLoginRequest', () => {
  it('trims the email and keeps the password as typed', () => {
    expect(toLoginRequest({ email: ' ops@stockkart.in ', password: ' secret ' })).toEqual({
      email: 'ops@stockkart.in',
      password: ' secret ',
    });
  });

  it('needs both fields', () => {
    expect(toLoginRequest({ email: '', password: 'x' })).toBeTypeOf('string');
    expect(toLoginRequest({ email: 'a@b.io', password: '' })).toBeTypeOf('string');
  });
});

describe('toChangePasswordRequest', () => {
  const valid = {
    currentPassword: 'old-password-1',
    newPassword: 'new-password-1',
    confirmPassword: 'new-password-1',
  };

  it('accepts a new, confirmed password within the length limits', () => {
    expect(toChangePasswordRequest(valid)).toEqual({
      currentPassword: 'old-password-1',
      newPassword: 'new-password-1',
    });
  });

  it('rejects missing, short, long, unchanged and unconfirmed passwords', () => {
    expect(toChangePasswordRequest({ ...valid, currentPassword: '' })).toMatch(/current/);
    expect(
      toChangePasswordRequest({ ...valid, newPassword: 'short', confirmPassword: 'short' }),
    ).toMatch(/10 to 128/);
    const long = 'x'.repeat(129);
    expect(toChangePasswordRequest({ ...valid, newPassword: long, confirmPassword: long })).toMatch(
      /10 to 128/,
    );
    expect(
      toChangePasswordRequest({
        ...valid,
        newPassword: valid.currentPassword,
        confirmPassword: valid.currentPassword,
      }),
    ).toMatch(/different/);
    expect(toChangePasswordRequest({ ...valid, confirmPassword: 'new-password-2' })).toMatch(
      /match/,
    );
  });
});

describe('toCreateAdminRequest', () => {
  it('normalises email and name', () => {
    expect(toCreateAdminRequest({ email: ' New@StockKart.in ', name: ' New Admin ' })).toEqual({
      email: 'new@stockkart.in',
      name: 'New Admin',
    });
  });

  it('rejects a bad email or an empty or overlong name', () => {
    expect(toCreateAdminRequest({ email: 'nope', name: 'X' })).toMatch(/email/);
    expect(toCreateAdminRequest({ email: 'a@b.io', name: '  ' })).toMatch(/Name/);
    expect(toCreateAdminRequest({ email: 'a@b.io', name: 'n'.repeat(61) })).toMatch(/Name/);
  });
});

describe('adminStatusBadge', () => {
  const admin: AdminAccount = {
    id: 'a1',
    email: 'ops@stockkart.in',
    name: 'Ops',
    active: true,
    mustChangePassword: false,
    createdByAdminId: null,
    createdAt: '2026-09-28T00:00:00Z',
    lastLoginAt: null,
  };

  it('shows turned-off admins before anything else', () => {
    expect(adminStatusBadge({ ...admin, active: false, mustChangePassword: true }).label).toBe(
      'Turned off',
    );
  });

  it('flags admins who still have a temporary password', () => {
    expect(adminStatusBadge({ ...admin, mustChangePassword: true }).label).toBe('Password not set');
    expect(adminStatusBadge(admin).label).toBe('Active');
  });
});
