import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { authApi } from '@inventory-platform/session/api';
import {
  Alert,
  Button,
  FormField,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import styles from './LoginForm.module.css';

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
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <Stack className={styles.formContainer} gap="md">
        <Stack className={styles.header} gap="xs">
          <Text variant="heading1" className={styles.title}>
            Invalid Reset Link
          </Text>
          <Text color="secondary" className={styles.subtitle}>
            This password reset link is invalid or has expired. Please request a
            new one.
          </Text>
        </Stack>
        {error ? (
          <Alert variant="danger" className={styles.errorMessage}>
            {error}
          </Alert>
        ) : null}
        <Stack className={styles.footer} gap="xs">
          <Text color="secondary" className={styles.footerText}>
            <Link to="/forgot-password" className={styles.link}>
              Request a new reset link
            </Link>
          </Text>
        </Stack>
      </Stack>
    );
  }

  if (success) {
    return (
      <Stack className={styles.formContainer} gap="md">
        <Stack className={styles.header} gap="xs">
          <Text variant="heading1" className={styles.title}>
            Password Reset
          </Text>
          <Text color="secondary" className={styles.subtitle}>
            Your password has been reset successfully. Redirecting you to sign
            in...
          </Text>
        </Stack>
        <Stack className={styles.footer} gap="xs">
          <Text color="secondary" className={styles.footerText}>
            <Link to="/login" className={styles.link}>
              Sign in now
            </Link>
          </Text>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack className={styles.formContainer} gap="md">
      <Stack className={styles.header} gap="xs">
        <Text variant="heading1" className={styles.title}>
          Reset Password
        </Text>
        <Text color="secondary" className={styles.subtitle}>
          Enter your new password below
        </Text>
      </Stack>

      {error ? (
        <Alert variant="danger" className={styles.errorMessage}>
          {error}
        </Alert>
      ) : null}

      <Stack className={styles.form} gap="md">
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
          className={styles.submitButton}
          onClick={() => void handleSubmit()}
          disabled={isLoading}
          loading={isLoading}
        >
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </Button>
      </Stack>

      <Stack className={styles.footer} gap="xs">
        <Text color="secondary" className={styles.footerText}>
          <Link to="/login" className={styles.link}>
            Back to sign in
          </Link>
        </Text>
      </Stack>
    </Stack>
  );
}
