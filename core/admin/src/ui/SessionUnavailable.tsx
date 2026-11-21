import { Alert, Button, Stack } from '@inventory-platform/ui-kit';

interface SessionUnavailableProps {
  retrying: boolean;
  onRetry: () => void;
}

/** The session check failed without a 401: the admin is still signed in, the API did not answer. */
export function SessionUnavailable({ retrying, onRetry }: SessionUnavailableProps) {
  return (
    <Stack gap="sm" align="center" padding="lg">
      <Alert variant="warning">
        Could not reach StockKart to check your admin session. You are still signed in.
      </Alert>
      <Button type="button" variant="solid" loading={retrying} onClick={onRetry}>
        Try again
      </Button>
    </Stack>
  );
}
