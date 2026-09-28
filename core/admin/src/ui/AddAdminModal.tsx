import { useState } from 'react';
import { Alert, Button, FormField, Input, Modal, Stack } from '@inventory-platform/ui-kit';
import type { AdminPasswordIssued } from '@inventory-platform/admin/types';
import { adminErrorMessage, toCreateAdminRequest } from '../forms/adminForms';
import { useCreateAdminMutation } from '../queries/hooks';

export interface AddAdminModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (issued: AdminPasswordIssued) => void;
}

/** Mount only while open so every opening starts with an empty form. */
export function AddAdminModal({ open, onClose, onCreated }: AddAdminModalProps) {
  const create = useCreateAdminMutation();
  const [form, setForm] = useState({ email: '', name: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const busy = create.isPending;
  const error = formError ?? (create.error ? adminErrorMessage(create.error) : null);

  const submit = () => {
    const request = toCreateAdminRequest(form);
    if (typeof request === 'string') {
      setFormError(request);
      return;
    }
    setFormError(null);
    create.mutate(request, { onSuccess: onCreated });
  };

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} size="md">
      <Modal.Header title="Add admin" onClose={busy ? undefined : onClose} />
      <Modal.Body>
        <Stack gap="md">
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <FormField label="Name" htmlFor="new-admin-name" required>
            <Input
              id="new-admin-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={busy}
            />
          </FormField>
          <FormField
            label="Email"
            htmlFor="new-admin-email"
            required
            hint="They sign in with this email and a temporary password you share."
          >
            <Input
              id="new-admin-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={busy}
            />
          </FormField>
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="solid" loading={busy} onClick={submit}>
          Add admin
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
