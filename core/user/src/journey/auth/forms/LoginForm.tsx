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
  SocialAuthSlot,
  Text,
  journeyChrome,
} from '@inventory-platform/ui-kit';

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();
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
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setLocalError(errorMessage);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setLocalError(null);
      clearError();
      if (credentialResponse.credential) {
        await login({
          idToken: credentialResponse.credential,
          loginType: 'google',
        });
        const from = (location.state as { from?: string })?.from || '/dashboard';
        navigate(from, { replace: true });
      } else {
        setLocalError('Google login failed. No credential received.');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Google login failed. Please try again.';
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
    <Box className={journeyChrome.authShell}>
      <Box className={journeyChrome.authCard}>
        <Box className={journeyChrome.authCardBody}>
          <Box className={journeyChrome.authHeader}>
            <Text as="h1" className={journeyChrome.authTitle}>
              Welcome back
            </Text>
          </Box>

          {displayError ? <Alert variant="danger">{displayError}</Alert> : null}

          <Box className={journeyChrome.authForm}>
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

            <Box className={journeyChrome.authMetaRow}>
              <Checkbox label="Remember me" />
              <Link to="/forgot-password" className={journeyChrome.authMetaLink}>
                Forgot password?
              </Link>
            </Box>

            <Button
              variant="brand"
              className={journeyChrome.authSubmit}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleSubmit();
              }}
              disabled={isLoading}
              loading={isLoading}
              fullWidth
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </Button>

            <Divider label="or" />

            <SocialAuthSlot>
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
            </SocialAuthSlot>
          </Box>

          <Box className={journeyChrome.authFooter}>
            Don&apos;t have an account? <Link to="/signup">Sign up</Link>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
