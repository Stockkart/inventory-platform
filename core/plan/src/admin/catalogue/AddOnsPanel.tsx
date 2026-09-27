import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Inline,
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
import type { AdminAddOn } from '@inventory-platform/plan/types';
import { useAdminAddOnsQuery, useSetAddOnActiveMutation } from '../hooks';
import { ReasonDialog } from '../ReasonDialog';
import { adminErrorMessage } from '../format';
import { FEATURE_LABELS, formatRupees } from '../../ui/planPricing';
import { describeAddOnGrant } from './catalogueForm';
import { AddOnFormModal } from './AddOnFormModal';

export function AddOnsPanel() {
  const [form, setForm] = useState<{ addOn: AdminAddOn | null } | null>(null);
  const [toggling, setToggling] = useState<AdminAddOn | null>(null);
  const query = useAdminAddOnsQuery();
  const activeMutation = useSetAddOnActiveMutation();
  const rows = query.data ?? [];

  const confirmToggle = (reason: string) => {
    if (!toggling) return;
    const active = !toggling.active;
    activeMutation.mutate(
      { id: toggling.id, body: { active, reason } },
      {
        onSuccess: () => {
          useNotify.success(active ? 'Add-on shown' : 'Add-on hidden');
          setToggling(null);
        },
      },
    );
  };

  return (
    <Stack gap="md">
      <Inline gap="md" align="center" justify="between">
        <Text variant="caption" color="secondary">
          In display order. Hidden add-ons can't be bought or get new vouchers; shops keep what they
          have.
        </Text>
        <Button variant="solid" onClick={() => setForm({ addOn: null })}>
          New add-on
        </Button>
      </Inline>

      {query.isError ? (
        <Alert variant="danger">{adminErrorMessage(query.error, 'Could not load add-ons.')}</Alert>
      ) : null}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Add-on</TableHeaderCell>
            <TableHeaderCell>Gives</TableHeaderCell>
            <TableHeaderCell>Price</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {query.isLoading ? (
            <TableLoadingRow colSpan={5} />
          ) : rows.length === 0 ? (
            <TableEmptyRow colSpan={5} message="No add-ons." />
          ) : (
            rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Text weight="semibold">{a.name}</Text>
                  <Text variant="caption" color="secondary">
                    {a.code}
                  </Text>
                </TableCell>
                <TableCell>
                  {describeAddOnGrant(a, (f) => FEATURE_LABELS[f], a.grantsFeature)}
                  {a.stackable ? (
                    <Text variant="caption" color="secondary">
                      {a.maxQuantity ? `Up to ${a.maxQuantity} per order` : 'Stackable'}
                    </Text>
                  ) : null}
                </TableCell>
                <TableCell>
                  {formatRupees(a.price)}
                  <Text as="span" variant="caption" color="secondary">
                    {a.billingType === 'ONE_TIME' ? ' one-time' : ' / year'}
                  </Text>
                </TableCell>
                <TableCell>
                  <Badge variant={a.active ? 'success' : 'neutral'}>
                    {a.active ? 'On sale' : 'Hidden'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Inline gap="sm">
                    <Button size="sm" variant="outline" onClick={() => setForm({ addOn: a })}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        activeMutation.reset();
                        setToggling(a);
                      }}
                    >
                      {a.active ? 'Hide' : 'Show'}
                    </Button>
                  </Inline>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AddOnFormModal
        open={form !== null}
        addOn={form?.addOn ?? null}
        onClose={() => setForm(null)}
      />
      <ReasonDialog
        open={toggling !== null}
        title={toggling?.active ? 'Hide add-on' : 'Show add-on'}
        message={
          toggling
            ? toggling.active
              ? `${toggling.name} stops being offered at checkout. Shops that bought it keep it.`
              : `${toggling.name} is offered at checkout again.`
            : undefined
        }
        confirmLabel={toggling?.active ? 'Hide' : 'Show'}
        confirmVariant={toggling?.active ? 'danger' : 'solid'}
        busy={activeMutation.isPending}
        error={activeMutation.error ? adminErrorMessage(activeMutation.error) : null}
        onConfirm={confirmToggle}
        onClose={() => setToggling(null)}
      />
    </Stack>
  );
}
