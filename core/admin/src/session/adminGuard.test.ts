import { describe, expect, it } from 'vitest';
import { ApiError } from '@inventory-platform/api-client';
import { adminRedirect, adminSessionStatus } from './adminGuard';

describe('adminRedirect', () => {
  it('sends visitors without a session to sign in', () => {
    expect(adminRedirect({ area: 'app', hasToken: false, status: 'idle' })).toBe('/login');
    expect(adminRedirect({ area: 'change-password', hasToken: false, status: 'idle' })).toBe(
      '/login',
    );
  });

  it('sends admins whose session was rejected to sign in', () => {
    expect(adminRedirect({ area: 'app', hasToken: true, status: 'error' })).toBe('/login');
    expect(adminRedirect({ area: 'change-password', hasToken: true, status: 'error' })).toBe(
      '/login',
    );
  });

  it('waits while the session is being checked', () => {
    expect(adminRedirect({ area: 'app', hasToken: true, status: 'loading' })).toBeNull();
    expect(adminRedirect({ area: 'login', hasToken: true, status: 'loading' })).toBeNull();
  });

  it('holds admins on the change-password page until they set a password', () => {
    expect(
      adminRedirect({ area: 'app', hasToken: true, status: 'ready', mustChangePassword: true }),
    ).toBe('/change-password');
    expect(
      adminRedirect({
        area: 'change-password',
        hasToken: true,
        status: 'ready',
        mustChangePassword: true,
      }),
    ).toBeNull();
  });

  it('lets signed-in admins use the app and change their password voluntarily', () => {
    expect(
      adminRedirect({ area: 'app', hasToken: true, status: 'ready', mustChangePassword: false }),
    ).toBeNull();
    expect(
      adminRedirect({
        area: 'change-password',
        hasToken: true,
        status: 'ready',
        mustChangePassword: false,
      }),
    ).toBeNull();
  });

  it('moves signed-in admins off the sign-in page', () => {
    expect(adminRedirect({ area: 'login', hasToken: false, status: 'idle' })).toBeNull();
    expect(
      adminRedirect({ area: 'login', hasToken: true, status: 'ready', mustChangePassword: false }),
    ).toBe('/');
    expect(
      adminRedirect({ area: 'login', hasToken: true, status: 'ready', mustChangePassword: true }),
    ).toBe('/change-password');
  });

  it('keeps admins in place when the API could not answer', () => {
    expect(adminRedirect({ area: 'app', hasToken: true, status: 'unavailable' })).toBeNull();
    expect(
      adminRedirect({ area: 'change-password', hasToken: true, status: 'unavailable' }),
    ).toBeNull();
    expect(adminRedirect({ area: 'login', hasToken: true, status: 'unavailable' })).toBeNull();
  });
});

describe('adminSessionStatus', () => {
  const base = { hasToken: true, hasAdmin: false, error: null };

  it('is idle without a token and ready once the admin is known', () => {
    expect(adminSessionStatus({ ...base, hasToken: false })).toBe('idle');
    expect(adminSessionStatus({ ...base, hasAdmin: true })).toBe('ready');
    expect(adminSessionStatus(base)).toBe('loading');
  });

  it('treats only a 401 as signed out', () => {
    expect(adminSessionStatus({ ...base, error: new ApiError('expired', { status: 401 }) })).toBe(
      'error',
    );
    expect(adminSessionStatus({ ...base, error: new ApiError('down', { status: 503 }) })).toBe(
      'unavailable',
    );
    expect(adminSessionStatus({ ...base, error: new ApiError('offline', { status: 0 }) })).toBe(
      'unavailable',
    );
    expect(adminSessionStatus({ ...base, error: new Error('boom') })).toBe('unavailable');
  });
});
