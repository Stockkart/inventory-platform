import { useState } from 'react';
import { Link } from 'react-router';
import { authApi } from '@inventory-platform/session/api';
import {
  Alert,
  Button,
  FormField,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import styles from './LoginForm.module.css';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.forgotPassword({ email: email.trim() });
      setSuccess(response.message);
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

  return (
    <Stack className={styles.formContainer} gap="md">
      <Stack className={styles.header} gap="xs">
        <Text variant="heading1" className={styles.title}>
          Forgot Password
        </Text>
        <Text color="secondary" className={styles.subtitle}>
          Enter your email and we&apos;ll send you a link to reset your
          password
        </Text>
      </Stack>

      {error ? (
        <Alert variant="danger" className={styles.errorMessage}>
          {error}
        </Alert>
      ) : null}

      {success ? (
        <Alert variant="success" className={styles.successMessage}>
          {success}
        </Alert>
      ) : null}

      <Stack className={styles.form} gap="md">
        <FormField
          label="Email"
          id="email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(v) => {
            setEmail(v);
            if (error || success) {
              setError(null);
              setSuccess(null);
            }
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
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </Button>
      </Stack>

      <Stack className={styles.footer} gap="xs">
        <Text color="secondary" className={styles.footerText}>
          Remember your password?{' '}
          <Link to="/login" className={styles.link}>
            Sign in
          </Link>
        </Text>
      </Stack>
    </Stack>
  );
}
