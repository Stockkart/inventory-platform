import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuthStore } from '@inventory-platform/session';
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  Checkbox,
  Divider,
  FormField,
  Link as UiLink,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import styles from './LoginForm.module.css';

export function SignupForm() {
  const navigate = useNavigate();
  const { signup, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleSubmit = async () => {
    setLocalError(null);
    clearError();

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setLocalError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'CASHIER',
      });
      navigate('/shop-selection');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      setLocalError(errorMessage);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setLocalError(null);
      clearError();
      if (credentialResponse.credential) {
        await signup({
          idToken: credentialResponse.credential,
          signupType: 'google',
          role: 'CASHIER',
        });
        navigate('/shop-selection');
      } else {
        setLocalError('Google signup failed. No credential received.');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Google signup failed. Please try again.';
      setLocalError(errorMessage);
    }
  };

  const handleGoogleError = () => {
    setLocalError('Google signup failed. Please try again.');
  };

  const clearErrors = () => {
    if (localError || error) {
      setLocalError(null);
      clearError();
    }
  };

  const displayError = localError || error;

  return (
    <Card>
      <CardBody>
        <Stack gap="md" width="full">
          <Stack gap="xs" align="center">
            <Text variant="heading1">Create Account</Text>
            <Text color="secondary">Get started with StockKart today</Text>
          </Stack>

          {displayError ? <Alert variant="danger">{displayError}</Alert> : null}

          <Stack gap="md" width="full">
            <FormField
              label="Full Name"
              id="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(v) => {
                setFormData({ ...formData, name: v });
                clearErrors();
              }}
              required
              disabled={isLoading}
            />

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
              required
              disabled={isLoading}
            />

            <FormField
              label="Password"
              id="password"
              type="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={(v) => {
                setFormData({ ...formData, password: v });
                clearErrors();
              }}
              required
              disabled={isLoading}
            />

            <FormField
              label="Confirm Password"
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(v) => {
                setFormData({ ...formData, confirmPassword: v });
                clearErrors();
              }}
              required
              disabled={isLoading}
            />

            <Checkbox
              required
              label={
                <>
                  I agree to the <UiLink href="#terms">Terms of Service</UiLink> and{' '}
                  <UiLink href="#privacy">Privacy Policy</UiLink>
                </>
              }
            />

            <Button
              variant="solid"
              onClick={() => void handleSubmit()}
              disabled={isLoading}
              loading={isLoading}
              fullWidth
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </Stack>

          <Divider label="or" />

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

          <Stack gap="xs" align="center">
            <Text color="secondary">
              Already have an account? <Link to="/login">Sign in</Link>
            </Text>
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  );
}
