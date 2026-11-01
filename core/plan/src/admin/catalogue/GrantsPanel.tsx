import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  FormField,
  Inline,
  Input,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TableLoadingRow,
  TableRow,
  Text,
  Textarea,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import type { AdminAddOn, ShopAddOn } from '@inventory-platform/plan/types';
import { useAdminAddOnsQuery, useGrantAddOnMutation, useShopAddOnsQuery } from '../hooks';
import { adminErrorMessage, formatAdminDate } from '../format';
import { emptyGrantForm, toGrantRequest, type GrantFormState } from './catalogueForm';

function holding(item: ShopAddOn): string {
  if (item.grantType === 'OCR_CREDITS') {
    return `${item.remainingCredits ?? 0} of ${item.grantedQuantity} credits left`;
  }
  if (item.grantType === 'FEATURE') return 'Unlocked';
  return `${item.grantedQuantity} (${item.quantity} pack${item.quantity === 1 ? '' : 's'})`;
}

function GrantForm({ shopId, addOns }: { shopId: string; addOns: AdminAddOn[] }) {
  const [form, setForm] = useState<GrantFormState>(emptyGrantForm);
  const [showErrors, setShowErrors] = useState(false);
  const mutation = useGrantAddOnMutation();
  const addOn = addOns.find((a) => a.code === form.addOnCode);
  const result = toGrantRequest(shopId, form, addOn);
  const errors = showErrors && !result.ok ? result.errors : {};
  const busy = mutation.isPending;

  useEffect(() => {
    setForm(emptyGrantForm());
    setShowErrors(false);
    mutation.reset();
  }, [shopId]);

  const set = <K extends keyof GrantFormState>(key: K, value: GrantFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = () => {
    setShowErrors(true);
    if (!result.ok) return;
    mutation.mutate(result.request, {
      onSuccess: (granted) => {
        useNotify.success(`${granted.name ?? granted.addOnCode} granted`);
        setForm(emptyGrantForm());
        setShowErrors(false);
      },
    });
  };

  return (
    <Stack gap="md">
      <Text variant="heading3" weight="semibold">
        Grant an add-on
      </Text>
      <Text variant="caption" color="secondary">
        Free of charge, for goodwill or support cases. Kept in the audit log.
      </Text>
      {mutation.error ? <Alert variant="danger">{adminErrorMessage(mutation.error)}</Alert> : null}
      <Inline gap="md" flexWrap align="start">
        <FormField label="Add-on" htmlFor="grant-addon" required error={errors.addOnCode}>
          <Select
            id="grant-addon"
            value={form.addOnCode}
            options={[
              { value: '', label: 'Choose an add-on' },
              ...addOns.map((a) => ({
                value: a.code,
                label: a.active ? a.name : `${a.name} (hidden)`,
              })),
            ]}
            onChange={(e) => set('addOnCode', e.target.value)}
            disabled={busy}
          />
        </FormField>
        {addOn?.grantType === 'FEATURE' ? null : (
          <FormField
            label="Packs"
            htmlFor="grant-quantity"
            required
            hint={addOn?.grantsQuantity ? `${addOn.grantsQuantity} per pack.` : undefined}
            error={errors.quantity}
          >
            <Input
              id="grant-quantity"
              inputMode="numeric"
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              disabled={busy}
            />
          </FormField>
        )}
        {addOn?.grantType === 'OCR_CREDITS' ? null : (
          <FormField
            label="Until"
            htmlFor="grant-expires"
            hint="End of the day, IST. Empty for the end of the shop's current plan."
          >
            <Input
              id="grant-expires"
              type="date"
              value={form.expiresOn}
              onChange={(e) => set('expiresOn', e.target.value)}
              disabled={busy}
            />
          </FormField>
        )}
      </Inline>
      <FormField label="Reason" htmlFor="grant-reason" required error={errors.reason}>
        <Textarea
          id="grant-reason"
          rows={2}
          value={form.reason}
          onChange={(e) => set('reason', e.target.value)}
          disabled={busy}
        />
      </FormField>
      <Inline>
        <Button variant="solid" loading={busy} onClick={submit}>
          Grant
        </Button>
      </Inline>
    </Stack>
  );
}

export function GrantsPanel() {
  const [shopInput, setShopInput] = useState('');
  const [shopId, setShopId] = useState<string | null>(null);
  const addOns = useAdminAddOnsQuery();
  const query = useShopAddOnsQuery(shopId);
  const rows = query.data ?? [];

  return (
    <Stack gap="md">
      <Inline gap="md" align="end">
        <FormField label="Shop ID" htmlFor="grant-shop-id">
          <Input
            id="grant-shop-id"
            value={shopInput}
            onChange={(e) => setShopInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && shopInput.trim()) setShopId(shopInput.trim());
            }}
          />
        </FormField>
        <Button
          variant="solid"
          disabled={!shopInput.trim()}
          onClick={() => setShopId(shopInput.trim())}
        >
          Look up
        </Button>
      </Inline>

      {query.isError ? (
        <Alert variant="danger">
          {adminErrorMessage(query.error, "Could not load that shop's add-ons.")}
        </Alert>
      ) : null}

      {shopId ? (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Add-on</TableHeaderCell>
                <TableHeaderCell>Holding</TableHeaderCell>
                <TableHeaderCell>Until</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {query.isLoading ? (
                <TableLoadingRow colSpan={4} />
              ) : rows.length === 0 ? (
                <TableEmptyRow colSpan={4} message="This shop has no add-ons." />
              ) : (
                rows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Text weight="semibold">{item.name ?? item.addOnCode}</Text>
                      <Text variant="caption" color="secondary">
                        {item.source === 'ADMIN' ? 'Granted by an admin' : 'Bought'}
                        {item.purchasedAt ? ` on ${formatAdminDate(item.purchasedAt)}` : ''}
                      </Text>
                    </TableCell>
                    <TableCell>{holding(item)}</TableCell>
                    <TableCell>{item.expiresAt ? formatAdminDate(item.expiresAt) : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={item.live ? 'success' : 'neutral'}>
                        {item.live ? 'Active' : 'Ended'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {addOns.data ? (
            <Card>
              <CardBody>
                <GrantForm shopId={shopId} addOns={addOns.data} />
              </CardBody>
            </Card>
          ) : null}
        </>
      ) : null}
    </Stack>
  );
}
