import type { PrintBridgeStatus } from '@inventory-platform/product/types';
import { Alert, Link, Stack, Text } from '@inventory-platform/ui-kit';

interface PrintBridgeNoticeProps {
  /** The backend's verdict on the bridge; null while checking or if the check failed. */
  status: PrintBridgeStatus | null;
  checking: boolean;
}

/**
 * What the dot matrix option will do on this computer, from the backend's verdict on the
 * print bridge. Three states, three different fixes: install, update, or nothing.
 */
export function PrintBridgeNotice({ status, checking }: PrintBridgeNoticeProps) {
  if (checking) {
    return <Alert variant="info">Looking for the print bridge on this computer…</Alert>;
  }
  if (!status) {
    return (
      <Alert variant="info">
        Could not check the print bridge. Never print the PDF on a dot-matrix printer.
      </Alert>
    );
  }

  const downloadLink = status.downloadUrl ? (
    <Link href={status.downloadUrl} target="_blank" rel="noopener noreferrer">
      Download Print Bridge v{status.latestVersion}
    </Link>
  ) : null;

  if (status.state === 'CONNECTED') {
    return (
      <Alert variant="info">
        Prints directly to {status.selectedPrinter ?? 'the selected printer'} via Print Bridge v
        {status.installedVersion} on this computer.
      </Alert>
    );
  }

  if (status.state === 'OUTDATED') {
    return (
      <Alert variant="warning">
        <Stack gap="xs">
          <Text as="span">
            Print Bridge v{status.installedVersion} on this computer is out of date. It still
            prints; v{status.latestVersion} is available.
          </Text>
          {downloadLink}
        </Stack>
      </Alert>
    );
  }

  return (
    <Alert variant="warning">
      <Stack gap="xs">
        <Text as="span">
          Print Bridge is not installed or not running on this computer. Until it is, the bill
          downloads as a .prn printer file: send it straight to the printer (copy /b &lt;file&gt;
          PRN on Windows) without opening it. Never print the PDF on a dot-matrix printer.
        </Text>
        {downloadLink}
        {downloadLink ? (
          <Text as="span" variant="caption" color="secondary">
            If Windows says it protected your PC, choose More info, then Run anyway.
          </Text>
        ) : null}
      </Stack>
    </Alert>
  );
}
