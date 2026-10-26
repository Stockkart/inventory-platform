import { Alert, Button, Inline, Text } from '@inventory-platform/ui-kit';
import type { HrDownloadState } from '../queries/hooks';

/**
 * The server's message for a failed download (e.g. "busy, try again in a few seconds" from the
 * heavy-request limiter) with a "Try again" button that repeats the same download.
 */
export function HrDownloadAlert({ download }: { download: HrDownloadState }) {
  if (!download.error) return null;
  return (
    <Alert variant="danger">
      <Inline gap="sm" flexWrap justify="between">
        <Text as="span">{download.error.message}</Text>
        <Inline gap="xs">
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={download.pending != null}
            onClick={download.retry}
          >
            Try again
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={download.dismiss}>
            Dismiss
          </Button>
        </Inline>
      </Inline>
    </Alert>
  );
}
