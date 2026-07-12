import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Badge,
  Box,
  CenteredLoader,
  PageHeader,
  Stack,
  Text,
  accountingChrome,
  surfaceChrome,
  cn,
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
  const planName = status.trial ? 'Base (Trial)' : status.plan?.planName ?? 'No active plan';
  const planStateLabel = status.trial
    ? status.trialExpired
      ? 'Trial ended'
      : 'Trial'
    : status.planExpired
    ? 'Expired'
    : 'Active';
  const renewLabel = status.trial || status.planExpired ? 'Expires' : 'Renews';

  const usageItems = [
    {
      label: 'Billing amount',
      value: `₹${status.currentUsage?.billingAmountUsed?.toLocaleString('en-IN') ?? 0}`,
      danger: status.billingLimitReached,
    },
    {
      label: 'Bills',
      value: String(status.currentUsage?.billCountUsed ?? 0),
      danger: status.billCountLimitReached,
    },
    {
      label: 'SMS',
      value: String(status.currentUsage?.smsUsed ?? 0),
      danger: status.smsLimitReached,
    },
    {
      label: 'WhatsApp',
      value: String(status.currentUsage?.whatsappUsed ?? 0),
      danger: status.whatsappLimitReached,
    },
  ];

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader description="Subscription, monthly usage, and upgrade options." />

      <Box className={surfaceChrome.planStatusSummary}>
        <Box className={surfaceChrome.planStatusSummaryMain}>
          <Text as="p" className={surfaceChrome.planStatusEyebrow}>
            Current plan
          </Text>
          <Box className={surfaceChrome.planStatusNameRow}>
            <Text as="h2" className={surfaceChrome.planStatusName}>
              {planName}
            </Text>
            <Badge
              variant={
                status.trialExpired || status.planExpired
                  ? 'warning'
                  : status.trial
                  ? 'info'
                  : 'success'
              }
            >
              {planStateLabel}
            </Badge>
          </Box>
          <Text as="p" className={surfaceChrome.planStatusMeta}>
            {status.trial ? '30-day trial · ' : null}
            {renewLabel} {formatDate(status.planExpiryDate)}
          </Text>
        </Box>
        {!status.trial && currentPlanIndex >= 0 ? (
          <Box className={surfaceChrome.planStatusSide}>
            <Text as="p" className={surfaceChrome.planStatusSideLabel}>
              Plan tier
            </Text>
            <Text as="p" className={surfaceChrome.planStatusSideValue}>
              {currentPlanIndex + 1} of {plans.length}
            </Text>
          </Box>
        ) : null}
      </Box>

      {status.trialExpired || status.planExpired ? (
        <Alert variant="warning">
          Your {status.trialExpired ? 'trial' : 'subscription'} has ended. Choose a plan below to
          continue.
        </Alert>
      ) : null}

      <Stack gap="sm">
        <Box className={surfaceChrome.planSectionHeader}>
          <Text as="h3" className={surfaceChrome.inviteSectionTitle}>
            This month&apos;s usage
          </Text>
        </Box>
        <Box className={accountingChrome.kpiGrid4}>
          {usageItems.map((item) => (
            <Box key={item.label} className={accountingChrome.overviewKpiCard}>
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                {item.label}
              </Text>
              <Text
                as="span"
                className={cn(
                  accountingChrome.overviewKpiValue,
                  item.danger && accountingChrome.overviewKpiValueWarning,
                )}
              >
                {item.value}
              </Text>
            </Box>
          ))}
        </Box>
      </Stack>

      <Stack gap="sm">
        <Box className={surfaceChrome.planSectionHeader}>
          <Text as="h3" className={surfaceChrome.inviteSectionTitle}>
            {status.planExpired || status.trialExpired ? 'Choose a plan' : 'Available plans'}
          </Text>
          <Text variant="caption" color="secondary">
            Select a plan to continue to payment.
          </Text>
        </Box>
        <PlanGrid
          plans={plans}
          currentPlanId={status.trial ? null : status.planId}
          onSelectPlan={handleSelectPlan}
          ctaLabel={status.planExpired || status.trialExpired ? 'Select plan' : 'Upgrade'}
          showTrialBadge
        />
      </Stack>

      {statusError ? (
        <Alert variant="danger">
          {statusErr instanceof Error ? statusErr.message : 'Failed to load plan status'}
        </Alert>
      ) : null}
    </Stack>
  );
}
