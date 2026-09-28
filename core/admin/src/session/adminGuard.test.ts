import { describe, expect, it } from 'vitest';
import { adminRedirect } from './adminGuard';

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
});
