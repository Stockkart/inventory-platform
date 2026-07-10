import { useState } from 'react';
import { Link } from 'react-router';
import { authApi } from '@inventory-platform/session/api';
import { Alert, Button, Card, CardBody, FormField, Stack, Text } from '@inventory-platform/ui-kit';

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
    <Card>
      <CardBody>
        <Stack gap="md" width="full">
          <Stack gap="xs" align="center">
            <Text variant="heading1">Forgot Password</Text>
            <Text color="secondary">
              Enter your email and we&apos;ll send you a link to reset your password
            </Text>
          </Stack>

          {error ? <Alert variant="danger">{error}</Alert> : null}
          {success ? <Alert variant="success">{success}</Alert> : null}

          <Stack gap="md" width="full">
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
              onClick={() => void handleSubmit()}
              disabled={isLoading}
              loading={isLoading}
              fullWidth
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </Stack>

          <Stack gap="xs" align="center">
            <Text color="secondary">
              Remember your password? <Link to="/login">Sign in</Link>
            </Text>
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  );
}
