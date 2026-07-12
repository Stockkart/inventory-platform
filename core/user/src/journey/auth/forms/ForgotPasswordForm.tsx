import { useState } from 'react';
import { Link } from 'react-router';
import { authApi } from '@inventory-platform/session/api';
import { Alert, Box, Button, FormField, Text, journeyChrome } from '@inventory-platform/ui-kit';

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
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box className={journeyChrome.authShell}>
      <Box className={journeyChrome.authCard}>
        <Box className={journeyChrome.authCardBody}>
          <Box className={journeyChrome.authHeader}>
            <Text as="p" className={journeyChrome.authEyebrow}>
              Account recovery
            </Text>
            <Text as="h1" className={journeyChrome.authTitle}>
              Forgot password
            </Text>
            <Text as="p" className={journeyChrome.authSubtitle}>
              Enter your email and we&apos;ll send a link to reset your password.
            </Text>
          </Box>

          {error ? <Alert variant="danger">{error}</Alert> : null}
          {success ? <Alert variant="success">{success}</Alert> : null}

          <Box className={journeyChrome.authForm}>
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
              variant="brand"
              className={journeyChrome.authSubmit}
              onClick={() => void handleSubmit()}
              disabled={isLoading}
              loading={isLoading}
              fullWidth
            >
              {isLoading ? 'Sending…' : 'Send reset link'}
            </Button>
          </Box>

          <Box className={journeyChrome.authFooter}>
            Remember your password? <Link to="/login">Sign in</Link>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
