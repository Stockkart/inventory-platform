import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { authApi } from '@inventory-platform/session/api';
import { Alert, Box, Button, FormField, Text, journeyChrome } from '@inventory-platform/ui-kit';

function AuthMessageCard({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <Box className={journeyChrome.authShell}>
      <Box className={journeyChrome.authCard}>
        <Box className={journeyChrome.authCardBody}>
          <Box className={journeyChrome.authHeader}>
            <Text as="p" className={journeyChrome.authEyebrow}>
              {eyebrow}
            </Text>
            <Text as="h1" className={journeyChrome.authTitle}>
              {title}
            </Text>
            <Text as="p" className={journeyChrome.authSubtitle}>
              {subtitle}
            </Text>
          </Box>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async () => {
    setError(null);

    if (!token) {
      setError('Invalid or missing reset link. Please request a new password reset.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword({
        token,
        newPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthMessageCard
        eyebrow="Account recovery"
        title="Invalid reset link"
        subtitle="This password reset link is invalid or has expired. Please request a new one."
      >
        {error ? <Alert variant="danger">{error}</Alert> : null}
        <Box className={journeyChrome.authFooter}>
          <Link to="/forgot-password">Request a new reset link</Link>
        </Box>
      </AuthMessageCard>
    );
  }

  if (success) {
    return (
      <AuthMessageCard
        eyebrow="Account recovery"
        title="Password reset"
        subtitle="Your password has been reset successfully. Redirecting you to sign in…"
      >
        <Box className={journeyChrome.authFooter}>
          <Link to="/login">Sign in now</Link>
        </Box>
      </AuthMessageCard>
    );
  }

  return (
    <Box className={journeyChrome.authShell}>
      <Box className={journeyChrome.authCard}>
        <Box className={journeyChrome.authCardBody}>
          <Box className={journeyChrome.authHeader}>
            <Text as="p" className={journeyChrome.authEyebrow}>
              Account recovery
            </Text>
            <Text as="h1" className={journeyChrome.authTitle}>
              Reset password
            </Text>
            <Text as="p" className={journeyChrome.authSubtitle}>
              Choose a new password for your StockKart account.
            </Text>
          </Box>

          {error ? <Alert variant="danger">{error}</Alert> : null}

          <Box className={journeyChrome.authForm}>
            <FormField
              label="New Password"
              id="newPassword"
              type="password"
              placeholder="Enter new password (min 8 characters)"
              value={newPassword}
              onChange={(v) => {
                setNewPassword(v);
                if (error) setError(null);
              }}
              disabled={isLoading}
            />

            <FormField
              label="Confirm Password"
              id="confirmPassword"
              type="password"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(v) => {
                setConfirmPassword(v);
                if (error) setError(null);
              }}
              disabled={isLoading}
            />

            <Button
              variant="brand"
              className={journeyChrome.authSubmit}
              onClick={() => void handleSubmit()}
              disabled={isLoading}
              loading={isLoading}
              fullWidth
            >
              {isLoading ? 'Resetting…' : 'Reset password'}
            </Button>
          </Box>

          <Box className={journeyChrome.authFooter}>
            <Link to="/login">Back to sign in</Link>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
