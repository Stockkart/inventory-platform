import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CenteredLoader,
  Grid,
  PageHeader,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import { PlanGrid } from '../ui/PlanGrid';
import type { PlanResponse } from '@inventory-platform/plan/types';
import { usePlansQuery, useShopPlanStatusQuery } from '../queries/hooks';

export function PlanStatusPage() {
  const navigate = useNavigate();
  const {
    data: status,
    isLoading: statusLoading,
    isError: statusError,
    error: statusErr,
  } = useShopPlanStatusQuery();
  const { data: plans = [] } = usePlansQuery();

  const handleSelectPlan = useCallback(
    (plan: PlanResponse) => {
      navigate(`/dashboard/plan-payment?planId=${plan.id}`);
    },
    [navigate],
  );

  if (statusLoading) {
    return (
      <Stack gap="md" width="full" maxWidth="xl" mx="auto">
        <CenteredLoader label="Loading plan status..." />
      </Stack>
    );
  }

  if (statusError && !status) {
    return (
      <Stack gap="md" width="full" maxWidth="xl" mx="auto">
        <Alert variant="danger">
          {statusErr instanceof Error ? statusErr.message : 'Failed to load plan status'}
        </Alert>
      </Stack>
    );
  }

  if (!status) {
    return null;
  }

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-IN') : '—';
  const currentPlanIndex = status.plan ? plans.findIndex((p) => p.id === status.planId) : -1;

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader description="View your subscription, usage, and upgrade options" />

      <Stack gap="md">
        <Card>
          <CardBody>
            <Stack gap="md">
              <Text variant="heading3" weight="semibold">
                Current Plan
              </Text>
              {status.trial ? (
                <Stack gap="sm">
                  <Badge variant="info">Trial</Badge>
                  <Text weight="semibold">Base (Trial) — 30 days</Text>
                  <Text color="secondary">Expires: {formatDate(status.planExpiryDate)}</Text>
                  {status.trialExpired ? (
                    <Alert variant="warning">
                      Your trial has ended. Choose a plan below to continue.
                    </Alert>
                  ) : null}
                </Stack>
              ) : (
                <Stack gap="sm">
                  <Text weight="semibold">{status.plan?.planName ?? '—'}</Text>
                  <Text color="secondary">
                    {status.planExpired ? 'Expired' : 'Renews'}: {formatDate(status.planExpiryDate)}
                  </Text>
                  {status.planExpired ? (
                    <Alert variant="warning">
                      Your subscription has ended. Choose a plan below to continue.
                    </Alert>
                  ) : null}
                  <Text variant="caption" color="secondary">
                    Plan {currentPlanIndex + 1} of {plans.length}
                  </Text>
                </Stack>
              )}
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stack gap="md">
              <Text variant="heading3" weight="semibold">
                This Month&apos;s Usage
              </Text>
              <Grid columns={4} gap="md" width="full">
                <Stack gap="xs">
                  <Text variant="label" color="secondary">
                    Billing Amount
                  </Text>
                  <Text
                    color={status.billingLimitReached ? 'danger' : 'primary'}
                    weight={status.billingLimitReached ? 'semibold' : 'normal'}
                  >
                    ₹{status.currentUsage?.billingAmountUsed?.toLocaleString('en-IN') ?? 0}
                  </Text>
                </Stack>
                <Stack gap="xs">
                  <Text variant="label" color="secondary">
                    Bills
                  </Text>
                  <Text
                    color={status.billCountLimitReached ? 'danger' : 'primary'}
                    weight={status.billCountLimitReached ? 'semibold' : 'normal'}
                  >
                    {status.currentUsage?.billCountUsed ?? 0}
                  </Text>
                </Stack>
                <Stack gap="xs">
                  <Text variant="label" color="secondary">
                    SMS
                  </Text>
                  <Text
                    color={status.smsLimitReached ? 'danger' : 'primary'}
                    weight={status.smsLimitReached ? 'semibold' : 'normal'}
                  >
                    {status.currentUsage?.smsUsed ?? 0}
                  </Text>
                </Stack>
                <Stack gap="xs">
                  <Text variant="label" color="secondary">
                    WhatsApp
                  </Text>
                  <Text
                    color={status.whatsappLimitReached ? 'danger' : 'primary'}
                    weight={status.whatsappLimitReached ? 'semibold' : 'normal'}
                  >
                    {status.currentUsage?.whatsappUsed ?? 0}
                  </Text>
                </Stack>
              </Grid>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stack gap="md">
              <Text variant="heading3" weight="semibold">
                {status.planExpired ? 'Choose a Plan' : 'Available Plans'}
              </Text>
              <Text color="secondary">Select a plan to proceed to payment</Text>
              <PlanGrid
                plans={plans}
                currentPlanId={status.trial ? null : status.planId}
                onSelectPlan={handleSelectPlan}
                ctaLabel={status.planExpired ? 'Select Plan' : 'Upgrade'}
                showTrialBadge
              />
            </Stack>
          </CardBody>
        </Card>

        {statusError ? (
          <Alert variant="danger">
            {statusErr instanceof Error ? statusErr.message : 'Failed to load plan status'}
          </Alert>
        ) : null}
      </Stack>
    </Stack>
  );
}
