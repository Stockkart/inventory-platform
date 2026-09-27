import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  FormField,
  Inline,
  PageHeader,
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
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import type { AdminVoucher } from '@inventory-platform/plan/types';
import {
  useAdminAddOnsQuery,
  useAdminVouchersQuery,
  useSetVoucherActiveMutation,
} from '../admin/hooks';
import { ReasonDialog } from '../admin/ReasonDialog';
import { adminErrorMessage, formatAdminDate } from '../admin/format';
import { describeVoucherValue, voucherUsage } from '../admin/vouchers/voucherForm';
import { GenerateVoucherModal } from '../admin/vouchers/GenerateVoucherModal';
import { EditVoucherModal } from '../admin/vouchers/EditVoucherModal';
import { RedemptionsModal } from '../admin/vouchers/RedemptionsModal';

function validity(voucher: AdminVoucher): string {
  if (!voucher.validFrom && !voucher.validTo) return 'Always';
  const from = voucher.validFrom ? formatAdminDate(voucher.validFrom) : 'Now';
  const to = voucher.validTo ? formatAdminDate(voucher.validTo) : 'no end';
  return `${from} – ${to}`;
}

export function VouchersAdminPage() {
  const [addOnCode, setAddOnCode] = useState('');
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState<AdminVoucher | null>(null);
  const [viewing, setViewing] = useState<AdminVoucher | null>(null);
  const [toggling, setToggling] = useState<AdminVoucher | null>(null);
  const addOns = useAdminAddOnsQuery();
  const query = useAdminVouchersQuery(addOnCode || null);
  const activeMutation = useSetVoucherActiveMutation();
  const rows = query.data ?? [];
  const catalogue = addOns.data ?? [];
  const addOnName = new Map(catalogue.map((a) => [a.code, a.name]));

  const confirmToggle = (reason: string) => {
    if (!toggling) return;
    const active = !toggling.active;
    activeMutation.mutate(
      { id: toggling.id, body: { active, reason } },
      {
        onSuccess: () => {
          useNotify.success(active ? 'Voucher turned on' : 'Voucher turned off');
          setToggling(null);
        },
      },
    );
  };

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader
        title="Vouchers"
        description="Codes that make an add-on free or cheaper at checkout. Every change is audited."
        actions={
          <Button variant="solid" disabled={!addOns.data} onClick={() => setGenerating(true)}>
            Create vouchers
          </Button>
        }
      />
      <Card>
        <CardBody>
          <Stack gap="md">
            <Inline gap="md" align="end">
              <FormField label="Add-on" htmlFor="voucher-filter-addon">
                <Select
                  id="voucher-filter-addon"
                  value={addOnCode}
                  options={[
                    { value: '', label: 'All add-ons' },
                    ...catalogue.map((a) => ({ value: a.code, label: a.name })),
                  ]}
                  onChange={(e) => setAddOnCode(e.target.value)}
                />
              </FormField>
              <Text variant="caption" color="secondary">
                Newest first.
              </Text>
            </Inline>

            {query.isError ? (
              <Alert variant="danger">
                {adminErrorMessage(query.error, 'Could not load vouchers.')}
              </Alert>
            ) : null}
            {addOns.isError ? (
              <Alert variant="danger">
                {adminErrorMessage(addOns.error, 'Could not load add-ons.')}
              </Alert>
            ) : null}

            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Code</TableHeaderCell>
                  <TableHeaderCell>Add-on</TableHeaderCell>
                  <TableHeaderCell>Discount</TableHeaderCell>
                  <TableHeaderCell>Used</TableHeaderCell>
                  <TableHeaderCell>Valid</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {query.isLoading ? (
                  <TableLoadingRow colSpan={7} />
                ) : rows.length === 0 ? (
                  <TableEmptyRow colSpan={7} message="No vouchers." />
                ) : (
                  rows.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <Text weight="semibold">{v.code}</Text>
                        {v.issuedToShopId ? (
                          <Text variant="caption" color="secondary">
                            Only shop {v.issuedToShopId}
                          </Text>
                        ) : null}
                        {v.note ? (
                          <Text variant="caption" color="secondary">
                            {v.note}
                          </Text>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {addOnName.get(v.addOnCode) ?? v.addOnCode}
                        {v.quantity > 1 ? (
                          <Text as="span" variant="caption" color="secondary">
                            {' '}
                            × {v.quantity}
                          </Text>
                        ) : null}
                      </TableCell>
                      <TableCell>{describeVoucherValue(v)}</TableCell>
                      <TableCell>{voucherUsage(v)}</TableCell>
                      <TableCell>{validity(v)}</TableCell>
                      <TableCell>
                        <Badge variant={v.active ? 'success' : 'neutral'}>
                          {v.active ? 'On' : 'Off'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Inline gap="sm">
                          <Button size="sm" variant="outline" onClick={() => setEditing(v)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setViewing(v)}>
                            Uses
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              activeMutation.reset();
                              setToggling(v);
                            }}
                          >
                            {v.active ? 'Turn off' : 'Turn on'}
                          </Button>
                        </Inline>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Stack>
        </CardBody>
      </Card>

      <GenerateVoucherModal
        open={generating}
        addOns={catalogue.filter((a) => a.active)}
        defaultAddOnCode={catalogue.some((a) => a.active && a.code === addOnCode) ? addOnCode : ''}
        onClose={() => setGenerating(false)}
      />
      <EditVoucherModal voucher={editing} onClose={() => setEditing(null)} />
      <RedemptionsModal voucher={viewing} onClose={() => setViewing(null)} />
      <ReasonDialog
        open={toggling !== null}
        title={toggling?.active ? 'Turn off voucher' : 'Turn on voucher'}
        message={
          toggling
            ? toggling.active
              ? `${toggling.code} stops working at checkout. Orders already holding it keep the discount.`
              : `${toggling.code} can be used at checkout again.`
            : undefined
        }
        confirmLabel={toggling?.active ? 'Turn off' : 'Turn on'}
        confirmVariant={toggling?.active ? 'danger' : 'solid'}
        busy={activeMutation.isPending}
        error={activeMutation.error ? adminErrorMessage(activeMutation.error) : null}
        onConfirm={confirmToggle}
        onClose={() => setToggling(null)}
      />
    </Stack>
  );
}
