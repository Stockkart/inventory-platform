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
import type { AdminPlan } from '@inventory-platform/plan/types';
import { useAdminPlansQuery, useSetPlanActiveMutation } from '../hooks';
import { ReasonDialog } from '../ReasonDialog';
import { adminErrorMessage } from '../format';
import { formatRupees } from '../../ui/planPricing';
import { TRIAL_PLAN_CODE } from './catalogueForm';
import { PlanFormModal } from './PlanFormModal';

export function PlansPanel() {
  const [form, setForm] = useState<{ plan: AdminPlan | null } | null>(null);
  const [toggling, setToggling] = useState<AdminPlan | null>(null);
  const query = useAdminPlansQuery();
  const activeMutation = useSetPlanActiveMutation();
  const rows = query.data ?? [];

  const confirmToggle = (reason: string) => {
    if (!toggling) return;
    const active = !toggling.active;
    activeMutation.mutate(
      { id: toggling.id, body: { active, reason } },
      {
        onSuccess: () => {
          useNotify.success(active ? 'Plan shown' : 'Plan hidden');
          setToggling(null);
        },
      },
    );
  };

  return (
    <Stack gap="md">
      <Inline gap="md" align="center" justify="between">
        <Text variant="caption" color="secondary">
          In display order. Hidden plans can't be bought; shops already on them keep them.
        </Text>
        <Button variant="solid" onClick={() => setForm({ plan: null })}>
          New plan
        </Button>
      </Inline>

      {query.isError ? (
        <Alert variant="danger">{adminErrorMessage(query.error, 'Could not load plans.')}</Alert>
      ) : null}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Plan</TableHeaderCell>
            <TableHeaderCell>Annual price</TableHeaderCell>
            <TableHeaderCell>Users</TableHeaderCell>
            <TableHeaderCell>Features</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {query.isLoading ? (
            <TableLoadingRow colSpan={6} />
          ) : rows.length === 0 ? (
            <TableEmptyRow colSpan={6} message="No plans." />
          ) : (
            rows.map((p) => {
              const trial = p.code === TRIAL_PLAN_CODE;
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <Text weight="semibold">{p.planName}</Text>
                    <Text variant="caption" color="secondary">
                      {p.code ?? 'No code'}
                      {p.badge ? ` · ${p.badge}` : ''}
                    </Text>
                  </TableCell>
                  <TableCell>{formatRupees(p.arcPrice)}</TableCell>
                  <TableCell>{p.userLimit ?? 'No limit'}</TableCell>
                  <TableCell>{p.features?.length ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={p.active ? 'success' : 'neutral'}>
                      {p.active ? 'On sale' : 'Hidden'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Inline gap="sm">
                      <Button size="sm" variant="outline" onClick={() => setForm({ plan: p })}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={trial && p.active}
                        title={
                          trial && p.active
                            ? 'New shops start on this plan, so it cannot be hidden.'
                            : undefined
                        }
                        onClick={() => {
                          activeMutation.reset();
                          setToggling(p);
                        }}
                      >
                        {p.active ? 'Hide' : 'Show'}
                      </Button>
                    </Inline>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <PlanFormModal
        open={form !== null}
        plan={form?.plan ?? null}
        plans={rows}
        onClose={() => setForm(null)}
      />
      <ReasonDialog
        open={toggling !== null}
        title={toggling?.active ? 'Hide plan' : 'Show plan'}
        message={
          toggling
            ? toggling.active
              ? `${toggling.planName} stops being offered. Shops already on it keep it.`
              : `${toggling.planName} is offered again.`
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
