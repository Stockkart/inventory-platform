import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Inline,
  PageHeader,
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
import type { AdminCampaign } from '@inventory-platform/plan/types';
import { useAdminCampaignsQuery, useSetCampaignActiveMutation } from '../admin/hooks';
import { ReasonDialog } from '../admin/ReasonDialog';
import { adminErrorMessage, formatAdminDate } from '../admin/format';
import { CAMPAIGN_THEME_LABEL, campaignVisibility } from '../admin/campaigns/campaignForm';
import { CampaignFormModal } from '../admin/campaigns/CampaignFormModal';

export function CampaignsAdminPage() {
  const [form, setForm] = useState<{ campaign: AdminCampaign | null } | null>(null);
  const [toggling, setToggling] = useState<AdminCampaign | null>(null);
  const query = useAdminCampaignsQuery();
  const activeMutation = useSetCampaignActiveMutation();
  const rows = query.data ?? [];

  const confirmToggle = (reason: string) => {
    if (!toggling) return;
    const active = !toggling.active;
    activeMutation.mutate(
      { id: toggling.id, body: { active, reason } },
      {
        onSuccess: () => {
          useNotify.success(active ? 'Campaign turned on' : 'Campaign turned off');
          setToggling(null);
        },
      },
    );
  };

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader
        title="Sale campaigns"
        description="The sale banner shops see on their dashboard. One campaign shows at a time; every change is audited."
        actions={
          <Button variant="solid" onClick={() => setForm({ campaign: null })}>
            New campaign
          </Button>
        }
      />
      <Card>
        <CardBody>
          <Stack gap="md">
            {query.isError ? (
              <Alert variant="danger">
                {adminErrorMessage(query.error, 'Could not load campaigns.')}
              </Alert>
            ) : null}
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Campaign</TableHeaderCell>
                  <TableHeaderCell>Theme</TableHeaderCell>
                  <TableHeaderCell>Runs</TableHeaderCell>
                  <TableHeaderCell>Priority</TableHeaderCell>
                  <TableHeaderCell>Shops see</TableHeaderCell>
                  <TableHeaderCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {query.isLoading ? (
                  <TableLoadingRow colSpan={6} />
                ) : rows.length === 0 ? (
                  <TableEmptyRow colSpan={6} message="No campaigns yet." />
                ) : (
                  rows.map((c) => {
                    const visibility = campaignVisibility(c);
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Text weight="semibold">{c.headline}</Text>
                          <Text variant="caption" color="secondary">
                            {c.code}
                          </Text>
                        </TableCell>
                        <TableCell>{CAMPAIGN_THEME_LABEL[c.theme]}</TableCell>
                        <TableCell>
                          {formatAdminDate(c.startsAt)} – {formatAdminDate(c.endsAt)}
                          {c.announceFrom ? (
                            <Text variant="caption" color="secondary">
                              Announced from {formatAdminDate(c.announceFrom)}
                            </Text>
                          ) : null}
                        </TableCell>
                        <TableCell>{c.priority}</TableCell>
                        <TableCell>
                          <Badge variant={visibility.variant}>{visibility.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Inline gap="sm">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setForm({ campaign: c })}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                activeMutation.reset();
                                setToggling(c);
                              }}
                            >
                              {c.active ? 'Turn off' : 'Turn on'}
                            </Button>
                          </Inline>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Stack>
        </CardBody>
      </Card>

      <CampaignFormModal
        open={form !== null}
        campaign={form?.campaign ?? null}
        onClose={() => setForm(null)}
      />
      <ReasonDialog
        open={toggling !== null}
        title={toggling?.active ? 'Turn off campaign' : 'Turn on campaign'}
        message={
          toggling
            ? toggling.active
              ? `The ${toggling.code} banner disappears for every shop.`
              : `The ${toggling.code} banner shows again within its dates.`
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
