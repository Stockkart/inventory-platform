import { useState } from 'react';
import { Alert, Button, Inline, Input, Modal, Stack, Text } from '@inventory-platform/ui-kit';
import type { AdminPasswordIssued } from '@inventory-platform/admin/types';

export interface TemporaryPasswordModalProps {
  issued: AdminPasswordIssued | null;
  title: string;
  onClose: () => void;
}

/** Shows a temporary password once. It cannot be looked up again, only reset. */
export function TemporaryPasswordModal({ issued, title, onClose }: TemporaryPasswordModalProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!issued) return;
    await navigator.clipboard.writeText(issued.temporaryPassword);
    setCopied(true);
  };

  const close = () => {
    setCopied(false);
    onClose();
  };

  return (
    <Modal open={issued !== null} onClose={close} size="md">
      <Modal.Header title={title} onClose={close} />
      <Modal.Body>
        {issued ? (
          <Stack gap="md">
            <Text>
              Give this temporary password to{' '}
              <Text as="span" weight="semibold">
                {issued.admin.name}
              </Text>{' '}
              ({issued.admin.email}). They choose their own password when they first sign in.
            </Text>
            <Inline gap="sm" align="center">
              <Input
                aria-label="Temporary password"
                value={issued.temporaryPassword}
                readOnly
                onFocus={(e) => e.target.select()}
              />
              <Button variant="outline" onClick={() => void copy()}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </Inline>
            <Alert variant="warning">
              This is the only time the password is shown. If it is lost, reset it again.
            </Alert>
          </Stack>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="solid" onClick={close}>
          Done
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
