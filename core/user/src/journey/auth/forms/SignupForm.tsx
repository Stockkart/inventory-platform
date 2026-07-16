import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuthStore } from '@inventory-platform/session';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormField,
  Link as UiLink,
  SocialAuthSlot,
  Text,
  journeyChrome,
} from '@inventory-platform/ui-kit';

/** Normalize to 10-digit Indian mobile; accepts 10 digits or +91 / 91 prefix. */
function normalizePhone(raw: string): string | null {
  const digitsOnly = raw.replace(/\D/g, '');
  if (/^\d{10}$/.test(digitsOnly)) {
    return digitsOnly;
  }
  if (/^91\d{10}$/.test(digitsOnly)) {
    return digitsOnly.slice(2);
  }
  return null;
}

export function SignupForm() {
  const navigate = useNavigate();
  const { signup, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
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

    if (
      !formData.name ||
      !formData.phone ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setLocalError('Please fill in all required fields');
      return;
    }

    const phone = normalizePhone(formData.phone);
    if (!phone) {
      setLocalError('Phone must be a valid Indian number (10 digits or +91 format)');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      await signup({
        name: formData.name,
        phone,
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
    <Box className={journeyChrome.authShell}>
      <Box className={journeyChrome.authCard}>
        <Box className={journeyChrome.authCardBody}>
          <Box className={journeyChrome.authHeader}>
            <Text as="h1" className={journeyChrome.authTitle}>
              Create account
            </Text>
          </Box>

          {displayError ? <Alert variant="danger">{displayError}</Alert> : null}

          <Box className={journeyChrome.authForm}>
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
              label="Phone"
              id="phone"
              type="tel"
              placeholder="10-digit mobile or +91…"
              value={formData.phone}
              onChange={(v) => {
                setFormData({ ...formData, phone: v });
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
              variant="brand"
              className={journeyChrome.authSubmit}
              onClick={() => void handleSubmit()}
              disabled={isLoading}
              loading={isLoading}
              fullWidth
            >
              {isLoading ? 'Creating account…' : 'Create Account'}
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
            Already have an account? <Link to="/login">Sign in</Link>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
