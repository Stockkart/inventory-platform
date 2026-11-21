import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  FormField,
  Input,
  Modal,
  Stack,
  Text,
  Textarea,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import type { AdminVoucher } from '@inventory-platform/plan/types';
import { useUpdateVoucherMutation } from '../hooks';
import { adminErrorMessage } from '../format';
import { toUpdateRequest, voucherEditState, type VoucherEditState } from './voucherForm';

export interface EditVoucherModalProps {
  voucher: AdminVoucher | null;
  onClose: () => void;
}

export function EditVoucherModal({ voucher, onClose }: EditVoucherModalProps) {
  const [edit, setEdit] = useState<VoucherEditState>({ validTo: '', maxRedemptions: '', note: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useUpdateVoucherMutation();
  const busy = mutation.isPending;

  useEffect(() => {
    if (!voucher) return;
    setEdit(voucherEditState(voucher));
    setFormError(null);
    mutation.reset();
  }, [voucher?.id]);

  const set = <K extends keyof VoucherEditState>(key: K, value: string) =>
    setEdit((prev) => ({ ...prev, [key]: value }));

  const submit = () => {
    if (!voucher) return;
    const result = toUpdateRequest(voucher, edit);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setFormError(null);
    mutation.mutate(
      { id: voucher.id, body: result.request },
      {
        onSuccess: () => {
          useNotify.success('Voucher updated');
          onClose();
        },
      },
    );
  };

  const error = formError ?? (mutation.error ? adminErrorMessage(mutation.error) : null);

  return (
    <Modal open={voucher !== null} onClose={busy ? undefined : onClose} size="md">
      <Modal.Header
        title={voucher ? `Edit ${voucher.code}` : 'Edit voucher'}
        onClose={busy ? undefined : onClose}
      />
      <Modal.Body>
        <Stack gap="md">
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <Text color="secondary">
            The add-on, discount and quantity are fixed once issued, so past redemptions stay
            accurate.
          </Text>
          <FormField
            label="Valid until"
            htmlFor="voucher-edit-to"
            hint="End of the day, IST. Empty for no end date."
          >
            <Input
              id="voucher-edit-to"
              type="date"
              value={edit.validTo}
              onChange={(e) => set('validTo', e.target.value)}
              disabled={busy}
            />
          </FormField>
          <FormField
            label="Uses per code"
            htmlFor="voucher-edit-cap"
            hint={
              voucher
                ? `Empty for no cap. ${
                    voucher.redemptionCount + voucher.reservedCount
                  } already taken.`
                : undefined
            }
          >
            <Input
              id="voucher-edit-cap"
              inputMode="numeric"
              value={edit.maxRedemptions}
              onChange={(e) => set('maxRedemptions', e.target.value)}
              disabled={busy}
            />
          </FormField>
          <FormField
            label="Note"
            htmlFor="voucher-edit-note"
            hint="Internal; kept in the audit log."
          >
            <Textarea
              id="voucher-edit-note"
              rows={2}
              value={edit.note}
              onChange={(e) => set('note', e.target.value)}
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
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
