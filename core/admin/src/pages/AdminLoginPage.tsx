import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  CenteredLoader,
  FormField,
  Input,
  JourneyMain,
  JourneyShell,
  Text,
  journeyChrome,
} from '@inventory-platform/ui-kit';
import { adminErrorMessage, toLoginRequest } from '../forms/adminForms';
import { useAdminLoginMutation } from '../queries/hooks';
import { ADMIN_PATHS } from '../session/adminGuard';
import { useAdminSession } from '../session/useAdminSession';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { checking } = useAdminSession('login');
  const login = useAdminLoginMutation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const submit = () => {
    const request = toLoginRequest(form);
    if (typeof request === 'string') {
      setFormError(request);
      return;
    }
    setFormError(null);
    login.mutate(request, {
      onSuccess: (response) =>
        navigate(
          response.admin.mustChangePassword ? ADMIN_PATHS.changePassword : ADMIN_PATHS.home,
          {
            replace: true,
          },
        ),
    });
  };

  if (checking) {
    return <CenteredLoader />;
  }

  const error = formError ?? (login.error ? adminErrorMessage(login.error) : null);

  return (
    <JourneyShell withHeaderOffset={false}>
      <JourneyMain>
        <Box className={journeyChrome.authShell}>
          <Box className={journeyChrome.authCard}>
            <Box className={journeyChrome.authCardBody}>
              <Box className={journeyChrome.authHeader}>
                <Text as="h1" className={journeyChrome.authTitle}>
                  StockKart Admin
                </Text>
                <Text color="secondary">Sign in with your admin account.</Text>
              </Box>

              {error ? <Alert variant="danger">{error}</Alert> : null}

              <Box className={journeyChrome.authForm}>
                <FormField label="Email" htmlFor="admin-email">
                  <Input
                    id="admin-email"
                    type="email"
                    autoComplete="username"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    disabled={login.isPending}
                  />
                </FormField>
                <FormField label="Password" htmlFor="admin-password">
                  <Input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submit();
                    }}
                    disabled={login.isPending}
                  />
                </FormField>
                <Button
                  variant="solid"
                  className={journeyChrome.authSubmit}
                  loading={login.isPending}
                  fullWidth
                  onClick={submit}
                >
                  Sign in
                </Button>
              </Box>

              <Box className={journeyChrome.authFooter}>
                Shop owners and staff sign in at the StockKart app, not here.
              </Box>
            </Box>
          </Box>
        </Box>
      </JourneyMain>
    </JourneyShell>
  );
}
