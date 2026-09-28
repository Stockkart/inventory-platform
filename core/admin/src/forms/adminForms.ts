import { isApiError } from '@inventory-platform/api-client';
import type {
  AdminAccount,
  AdminChangePasswordRequest,
  AdminCreateRequest,
  AdminLoginRequest,
} from '@inventory-platform/admin/types';
import type { BadgeVariant } from '@inventory-platform/ui-kit';

export const ADMIN_PASSWORD_MIN = 10;
export const ADMIN_PASSWORD_MAX = 128;
export const ADMIN_NAME_MAX = 60;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function toLoginRequest(form: AdminLoginRequest): AdminLoginRequest | string {
  const email = form.email.trim();
  if (!email || !form.password) return 'Enter your email and password.';
  return { email, password: form.password };
}

export interface ChangePasswordForm extends AdminChangePasswordRequest {
  confirmPassword: string;
}

export function toChangePasswordRequest(
  form: ChangePasswordForm,
): AdminChangePasswordRequest | string {
  if (!form.currentPassword) return 'Enter your current password.';
  if (
    form.newPassword.length < ADMIN_PASSWORD_MIN ||
    form.newPassword.length > ADMIN_PASSWORD_MAX
  ) {
    return `New password must be ${ADMIN_PASSWORD_MIN} to ${ADMIN_PASSWORD_MAX} characters.`;
  }
  if (form.newPassword === form.currentPassword) {
    return 'Choose a password different from the current one.';
  }
  if (form.newPassword !== form.confirmPassword) return 'The new passwords do not match.';
  return { currentPassword: form.currentPassword, newPassword: form.newPassword };
}

export function toCreateAdminRequest(form: AdminCreateRequest): AdminCreateRequest | string {
  const email = form.email.trim().toLowerCase();
  const name = form.name.trim();
  if (!EMAIL.test(email)) return 'Enter a valid email address.';
  if (!name || name.length > ADMIN_NAME_MAX)
    return `Name must be 1 to ${ADMIN_NAME_MAX} characters.`;
  return { email, name };
}

export function adminStatusBadge(admin: AdminAccount): { label: string; variant: BadgeVariant } {
  if (!admin.active) return { label: 'Turned off', variant: 'neutral' };
  if (admin.mustChangePassword) return { label: 'Password not set', variant: 'warning' };
  return { label: 'Active', variant: 'success' };
}

export function adminErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Try again.',
): string {
  if (isApiError(error) && error.message) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function formatAdminDateTime(iso: string | null | undefined): string {
  return iso
    ? new Date(iso).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
}
