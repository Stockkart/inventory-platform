import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Check, Lock } from 'lucide-react';
import {
  Alert,
  Badge,
  Box,
  CenteredLoader,
  PageHeader,
  Stack,
  Text,
  surfaceChrome,
  cn,
} from '@inventory-platform/ui-kit';
import { PlanGrid } from '../ui/PlanGrid';
import { formatPlanDate } from '../ui/planDate';
import { FEATURE_LABELS, formatRupees } from '../ui/planPricing';
import { trialLabel } from '../ui/trialLabel';
import { boughtScansLeftLabel, isPlanFeature, splitFeatures, usageOfLimit } from '../entitlements';
import { CampaignBanner } from '../campaign';
import type { PlanResponse } from '@inventory-platform/plan/types';
import { usePlansQuery, useShopEntitlementsQuery, useShopPlanStatusQuery } from '../queries/hooks';

export function PlanStatusPage() {
  const navigate = useNavigate();
  const {
    data: status,
    isLoading: statusLoading,
    isError: statusError,
    error: statusErr,
  } = useShopPlanStatusQuery();
  const { data: plans = [] } = usePlansQuery();
  const [searchParams] = useSearchParams();
  const lockedParam = searchParams.get('locked');
  const lockedFeature = isPlanFeature(lockedParam) ? lockedParam : null;
  // Seat and OCR usage change between visits, so this page always refetches on arrival.
  const { data: entitlements } = useShopEntitlementsQuery({ refetchOnMount: 'always' });

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

  const currentPlanIndex = status.plan ? plans.findIndex((p) => p.id === status.planId) : -1;
  const planName = status.trial ? 'Free trial' : status.plan?.planName ?? 'No active plan';
  const planStateLabel = status.trial
    ? status.trialExpired
      ? 'Trial ended'
      : 'Trial'
    : status.planExpired
    ? 'Expired'
    : 'Active';
  const renewLabel = status.trial || status.planExpired ? 'Expires' : 'Renews';

  const usageItems: { label: string; value: string; danger: boolean; hint?: string | null }[] = [
    {
      label: 'Billing amount',
      value: formatRupees(status.currentUsage?.billingAmountUsed ?? 0),
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
  if (entitlements) {
    usageItems.push(
      {
        label: 'Team seats',
        value: usageOfLimit(entitlements.userCount, entitlements.userLimit, 'seats'),
        danger: entitlements.seatLimitReached === true,
      },
      {
        label: 'Invoice scans',
        value: usageOfLimit(entitlements.ocrUsed, entitlements.ocrLimit, 'scans'),
        hint: boughtScansLeftLabel(entitlements.ocrTopUpRemaining),
        danger: entitlements.ocrLimitReached === true,
      },
    );
  }
  const features = entitlements ? splitFeatures(entitlements) : null;

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader description="Subscription, monthly usage, and upgrade options." />

      <CampaignBanner className={surfaceChrome.planCampaignStrip} />

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
              className={cn(
                surfaceChrome.planStatusBadge,
                (status.trialExpired || status.planExpired) && surfaceChrome.planStatusBadgeWarning,
              )}
            >
              {planStateLabel}
            </Badge>
          </Box>
          <Text as="p" className={surfaceChrome.planStatusMeta}>
            {status.trial ? `${trialLabel(status.trialDays)} · ` : null}
            {renewLabel} {formatPlanDate(status.planExpiryDate) ?? '—'}
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

      {lockedFeature ? (
        <Alert variant="info">
          {FEATURE_LABELS[lockedFeature]} isn&apos;t included in your plan. Upgrade below to unlock
          it.
        </Alert>
      ) : null}

      {status.trialExpired || status.planExpired ? (
        <Alert variant="warning">
          Your {status.trialExpired ? 'trial' : 'subscription'} has ended. Choose a plan below to
          continue.
        </Alert>
      ) : null}

      <Stack gap="sm">
        <Box className={surfaceChrome.planSectionHeader}>
          <Text as="h3" className={surfaceChrome.planSectionTitle}>
            This month&apos;s usage
          </Text>
        </Box>
        <Box className={surfaceChrome.planUsageGrid}>
          {usageItems.map((item) => (
            <Box
              key={item.label}
              className={cn(
                surfaceChrome.planUsageCard,
                item.danger && surfaceChrome.planUsageCardDanger,
              )}
            >
              <Text as="span" className={surfaceChrome.planUsageLabel}>
                {item.label}
              </Text>
              <Text
                as="span"
                className={cn(
                  surfaceChrome.planUsageValue,
                  item.danger && surfaceChrome.planUsageValueDanger,
                )}
              >
                {item.value}
              </Text>
              {item.hint ? (
                <Text as="span" variant="caption" color="secondary">
                  {item.hint}
                </Text>
              ) : null}
            </Box>
          ))}
        </Box>
      </Stack>

      {features ? (
        <Stack gap="sm">
          <Box className={surfaceChrome.planSectionHeader}>
            <Text as="h3" className={surfaceChrome.planSectionTitle}>
              What your plan includes
            </Text>
          </Box>
          <Box className={surfaceChrome.planFeaturePanel}>
            {features.included.map((feature) => (
              <Box key={feature} className={surfaceChrome.planFeatureItem}>
                <Box as="span" className={surfaceChrome.planFeatureIcon}>
                  <Check size={14} strokeWidth={3} aria-hidden />
                </Box>
                <Text as="span" className={surfaceChrome.planFeatureLabel}>
                  {FEATURE_LABELS[feature]}
                </Text>
              </Box>
            ))}
            {features.locked.map((feature) => (
              <Box
                key={feature}
                className={cn(
                  surfaceChrome.planFeatureItem,
                  surfaceChrome.planFeatureItemLocked,
                  feature === lockedFeature && surfaceChrome.planFeatureItemHighlight,
                )}
              >
                <Box
                  as="span"
                  className={cn(surfaceChrome.planFeatureIcon, surfaceChrome.planFeatureIconLocked)}
                >
                  <Lock size={12} aria-hidden />
                </Box>
                <Text as="span" className={surfaceChrome.planFeatureLabel}>
                  {FEATURE_LABELS[feature]}
                </Text>
                <Badge variant={feature === lockedFeature ? 'warning' : 'neutral'}>Upgrade</Badge>
              </Box>
            ))}
          </Box>
        </Stack>
      ) : null}

      <Stack gap="sm">
        <Box className={surfaceChrome.planSectionHeader}>
          <Text as="h3" className={surfaceChrome.planSectionTitle}>
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
          showTrialBadge={status.trialAvailable === true}
          planOptions={status.planOptions}
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
