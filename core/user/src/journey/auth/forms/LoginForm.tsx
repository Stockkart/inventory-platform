import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuthStore } from '@inventory-platform/session';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormField,
  Inline,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import styles from './LoginForm.module.css';

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, error, clearError } =
    useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: string })?.from || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleSubmit = async () => {
    setLocalError(null);
    clearError();

    if (isLoading) {
      return;
    }

    if (!formData.email || !formData.password) {
      setLocalError('Please fill in all required fields');
      return;
    }

    try {
      await login({
        email: formData.email,
        password: formData.password,
      });
      const from = (location.state as { from?: string })?.from || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
      setLocalError(errorMessage);
    }
  };

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse
  ) => {
    try {
      setLocalError(null);
      clearError();
      if (credentialResponse.credential) {
        await login({
          idToken: credentialResponse.credential,
          loginType: 'google',
        });
        const from =
          (location.state as { from?: string })?.from || '/dashboard';
        navigate(from, { replace: true });
      } else {
        setLocalError('Google login failed. No credential received.');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Google login failed. Please try again.';
      setLocalError(errorMessage);
    }
  };

  const handleGoogleError = () => {
    setLocalError('Google login failed. Please try again.');
  };

  const clearErrors = () => {
    if (localError || error) {
      setLocalError(null);
      clearError();
    }
  };

  const displayError = localError || error;

  return (
    <Stack className={styles.formContainer} gap="md">
      <Stack className={styles.header} gap="xs">
        <Text variant="heading1" className={styles.title}>
          Welcome Back
        </Text>
        <Text color="secondary" className={styles.subtitle}>
          Sign in to your StockKart account
        </Text>
      </Stack>

      {displayError ? (
        <Alert variant="danger" className={styles.errorMessage}>
          {displayError}
        </Alert>
      ) : null}

      <Stack className={styles.form} gap="md">
        <FormField
          label="Email"
          id="email"
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={(v) => {
            setFormData({ ...formData, email: v });
            clearErrors();
          }}
          disabled={isLoading}
        />

        <FormField
          label="Password"
          id="password"
          type="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={(v) => {
            setFormData({ ...formData, password: v });
            clearErrors();
          }}
          disabled={isLoading}
        />

        <Inline className={styles.options} justify="between" width="full">
          <Checkbox label="Remember me" />
          <Link to="/forgot-password" className={styles.forgotLink}>
            Forgot password?
          </Link>
        </Inline>

        <Button
          variant="solid"
          className={styles.submitButton}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void handleSubmit();
          }}
          disabled={isLoading}
          loading={isLoading}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </Button>

        <Divider label="or" className={styles.divider} />

        <Box className={styles.socialButtons}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
            auto_select={false}
            theme="outline"
            size="large"
            type="standard"
            shape="pill"
            ux_mode="popup"
          />
        </Box>
      </Stack>

      <Stack className={styles.footer} gap="xs">
        <Text color="secondary" className={styles.footerText}>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className={styles.link}>
            Sign up
          </Link>
        </Text>
      </Stack>
    </Stack>
  );
}
