import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  CenteredLoader,
  FormField,
  Inline,
  Input,
  JourneyMain,
  JourneyShell,
  Text,
  journeyChrome,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  ADMIN_PASSWORD_MAX,
  ADMIN_PASSWORD_MIN,
  adminErrorMessage,
  toChangePasswordRequest,
  type ChangePasswordForm,
} from '../forms/adminForms';
import { useAdminChangePasswordMutation, useAdminLogoutMutation } from '../queries/hooks';
import { ADMIN_PATHS } from '../session/adminGuard';
import { useAdminSession } from '../session/useAdminSession';

const EMPTY: ChangePasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function AdminChangePasswordPage() {
  const navigate = useNavigate();
  const { admin, checking } = useAdminSession('change-password');
  const change = useAdminChangePasswordMutation();
  const logout = useAdminLogoutMutation();
  const [form, setForm] = useState<ChangePasswordForm>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);

  if (checking || !admin) {
    return <CenteredLoader />;
  }

  const forced = admin.mustChangePassword;
  const busy = change.isPending || logout.isPending;
  const error = formError ?? (change.error ? adminErrorMessage(change.error) : null);

  const submit = () => {
    const request = toChangePasswordRequest(form);
    if (typeof request === 'string') {
      setFormError(request);
      return;
    }
    setFormError(null);
    change.mutate(request, {
      onSuccess: () => {
        useNotify.success('Password updated. Your other sessions were signed out.');
        navigate(ADMIN_PATHS.home, { replace: true });
      },
    });
  };

  const field = (key: keyof ChangePasswordForm, label: string, autoComplete: string) => (
    <FormField label={label} htmlFor={`admin-${key}`} required>
      <Input
        id={`admin-${key}`}
        type="password"
        autoComplete={autoComplete}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        disabled={busy}
      />
    </FormField>
  );

  return (
    <JourneyShell withHeaderOffset={false}>
      <JourneyMain>
        <Box className={journeyChrome.authShell}>
          <Box className={journeyChrome.authCard}>
            <Box className={journeyChrome.authCardBody}>
              <Box className={journeyChrome.authHeader}>
                <Text as="h1" className={journeyChrome.authTitle}>
                  {forced ? 'Set your password' : 'Change password'}
                </Text>
                <Text color="secondary">{admin.email}</Text>
              </Box>

              {forced ? (
                <Alert variant="info">
                  You signed in with a temporary password. Choose your own to continue.
                </Alert>
              ) : null}
              {error ? <Alert variant="danger">{error}</Alert> : null}

              <Box className={journeyChrome.authForm}>
                {field(
                  'currentPassword',
                  forced ? 'Temporary password' : 'Current password',
                  'current-password',
                )}
                {field('newPassword', 'New password', 'new-password')}
                {field('confirmPassword', 'Repeat new password', 'new-password')}
                <Text variant="caption" color="secondary">
                  {ADMIN_PASSWORD_MIN} to {ADMIN_PASSWORD_MAX} characters.
                </Text>
                <Button
                  variant="solid"
                  className={journeyChrome.authSubmit}
                  loading={change.isPending}
                  disabled={busy}
                  fullWidth
                  onClick={submit}
                >
                  Save password
                </Button>
              </Box>

              <Inline justify="center" gap="sm">
                {forced ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      logout.mutate(undefined, {
                        onSettled: () => navigate(ADMIN_PATHS.login, { replace: true }),
                      })
                    }
                  >
                    Sign out
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => navigate(ADMIN_PATHS.home)}
                  >
                    Cancel
                  </Button>
                )}
              </Inline>
            </Box>
          </Box>
        </Box>
      </JourneyMain>
    </JourneyShell>
  );
}
