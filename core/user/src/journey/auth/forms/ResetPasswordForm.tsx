import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { authApi } from '@inventory-platform/session/api';
import { Alert, Button, Card, CardBody, FormField, Stack, Text } from '@inventory-platform/ui-kit';

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
      <Card>
        <CardBody>
          <Stack gap="md" width="full">
            <Stack gap="xs" align="center">
              <Text variant="heading1">Invalid Reset Link</Text>
              <Text color="secondary">
                This password reset link is invalid or has expired. Please request a new one.
              </Text>
            </Stack>
            {error ? <Alert variant="danger">{error}</Alert> : null}
            <Stack gap="xs" align="center">
              <Text color="secondary">
                <Link to="/forgot-password">Request a new reset link</Link>
              </Text>
            </Stack>
          </Stack>
        </CardBody>
      </Card>
    );
  }

  if (success) {
    return (
      <Card>
        <CardBody>
          <Stack gap="md" width="full">
            <Stack gap="xs" align="center">
              <Text variant="heading1">Password Reset</Text>
              <Text color="secondary">
                Your password has been reset successfully. Redirecting you to sign in...
              </Text>
            </Stack>
            <Stack gap="xs" align="center">
              <Text color="secondary">
                <Link to="/login">Sign in now</Link>
              </Text>
            </Stack>
          </Stack>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <Stack gap="md" width="full">
          <Stack gap="xs" align="center">
            <Text variant="heading1">Reset Password</Text>
            <Text color="secondary">Enter your new password below</Text>
          </Stack>

          {error ? <Alert variant="danger">{error}</Alert> : null}

          <Stack gap="md" width="full">
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
              variant="solid"
              onClick={() => void handleSubmit()}
              disabled={isLoading}
              loading={isLoading}
              fullWidth
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </Stack>

          <Stack gap="xs" align="center">
            <Text color="secondary">
              <Link to="/login">Back to sign in</Link>
            </Text>
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  );
}
