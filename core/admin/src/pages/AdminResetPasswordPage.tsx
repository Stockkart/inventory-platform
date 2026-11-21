import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Alert,
  Box,
  Button,
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
  toResetPasswordRequest,
  type ResetPasswordForm,
} from '../forms/adminForms';
import { useAdminResetPasswordWithTokenMutation } from '../queries/hooks';
import { ADMIN_PATHS } from '../session/adminGuard';

const EMPTY: ResetPasswordForm = { newPassword: '', confirmPassword: '' };

/** Public page behind the emailed reset link (`/reset-password?token=…`). */
export function AdminResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const reset = useAdminResetPasswordWithTokenMutation();
  const [form, setForm] = useState<ResetPasswordForm>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const error = formError ?? (reset.error ? adminErrorMessage(reset.error) : null);

  const submit = () => {
    const request = toResetPasswordRequest(token, form);
    if (typeof request === 'string') {
      setFormError(request);
      return;
    }
    setFormError(null);
    reset.mutate(request, {
      onSuccess: () => {
        useNotify.success('Password set. Sign in with your new password.');
        navigate(ADMIN_PATHS.login, { replace: true });
      },
    });
  };

  const field = (key: keyof ResetPasswordForm, label: string) => (
    <FormField label={label} htmlFor={`admin-reset-${key}`} required>
      <Input
        id={`admin-reset-${key}`}
        type="password"
        autoComplete="new-password"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        disabled={reset.isPending}
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
                  Set a new password
                </Text>
                <Text color="secondary">From the reset link another admin sent you.</Text>
              </Box>

              {error ? <Alert variant="danger">{error}</Alert> : null}

              <Box className={journeyChrome.authForm}>
                {field('newPassword', 'New password')}
                {field('confirmPassword', 'Repeat new password')}
                <Text variant="caption" color="secondary">
                  {ADMIN_PASSWORD_MIN} to {ADMIN_PASSWORD_MAX} characters.
                </Text>
                <Button
                  variant="solid"
                  className={journeyChrome.authSubmit}
                  loading={reset.isPending}
                  disabled={reset.isPending}
                  fullWidth
                  onClick={submit}
                >
                  Save password
                </Button>
              </Box>

              <Inline justify="center">
                <Button variant="ghost" size="sm" onClick={() => navigate(ADMIN_PATHS.login)}>
                  Back to sign in
                </Button>
              </Inline>
            </Box>
          </Box>
        </Box>
      </JourneyMain>
    </JourneyShell>
  );
}
