import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Badge,
  Box,
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
import styles from './plan-status.module.css';

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
    [navigate]
  );

  if (statusLoading) {
    return (
      <Box className={styles.page}>
        <CenteredLoader label="Loading plan status..." />
      </Box>
    );
  }

  if (statusError && !status) {
    return (
      <Box className={styles.page}>
        <Alert variant="danger">
          {statusErr instanceof Error
            ? statusErr.message
            : 'Failed to load plan status'}
        </Alert>
      </Box>
    );
  }

  if (!status) {
    return null;
  }

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-IN') : '—';
  const currentPlanIndex = status.plan
    ? plans.findIndex((p) => p.id === status.planId)
    : -1;

  return (
    <Stack gap="md" className={styles.page}>
      <PageHeader
        title="Plan"
        description="View your subscription, usage, and upgrade options"
      />

      <Box className={styles.container}>
        <Stack gap="md">
          <Box as="section" className={styles.section}>
            <Text as="h3" variant="heading3" className={styles.sectionTitle}>
              Current Plan
            </Text>
            <Card className={styles.planCard}>
              <CardBody>
                {status.trial ? (
                  <Stack gap="sm">
                    <Badge className={styles.trialBadge}>Trial</Badge>
                    <Text className={styles.planName}>
                      Base (Trial) — 30 days
                    </Text>
                    <Text className={styles.planExpiry}>
                      Expires: {formatDate(status.planExpiryDate)}
                    </Text>
                    {status.trialExpired ? (
                      <Alert variant="warning" className={styles.trialExpired}>
                        Your trial has ended. Choose a plan below to continue.
                      </Alert>
                    ) : null}
                  </Stack>
                ) : (
                  <Stack gap="sm">
                    <Text className={styles.planName}>
                      {status.plan?.planName ?? '—'}
                    </Text>
                    <Text className={styles.planExpiry}>
                      {status.planExpired ? 'Expired' : 'Renews'}:{' '}
                      {formatDate(status.planExpiryDate)}
                    </Text>
                    {status.planExpired ? (
                      <Alert variant="warning" className={styles.trialExpired}>
                        Your subscription has ended. Choose a plan below to
                        continue.
                      </Alert>
                    ) : null}
                    <Text className={styles.planPosition}>
                      Plan {currentPlanIndex + 1} of {plans.length}
                    </Text>
                  </Stack>
                )}
              </CardBody>
            </Card>
          </Box>

          <Box as="section" className={styles.section}>
            <Text as="h3" variant="heading3" className={styles.sectionTitle}>
              This Month&apos;s Usage
            </Text>
            <Grid className={styles.usageGrid}>
              <Box className={styles.usageItem}>
                <Text as="span" className={styles.usageLabel}>
                  Billing Amount
                </Text>
                <Text
                  as="span"
                  className={
                    status.billingLimitReached ? styles.usageLimitReached : undefined
                  }
                >
                  ₹
                  {status.currentUsage?.billingAmountUsed?.toLocaleString(
                    'en-IN'
                  ) ?? 0}
                </Text>
              </Box>
              <Box className={styles.usageItem}>
                <Text as="span" className={styles.usageLabel}>
                  Bills
                </Text>
                <Text
                  as="span"
                  className={
                    status.billCountLimitReached ? styles.usageLimitReached : undefined
                  }
                >
                  {status.currentUsage?.billCountUsed ?? 0}
                </Text>
              </Box>
              <Box className={styles.usageItem}>
                <Text as="span" className={styles.usageLabel}>
                  SMS
                </Text>
                <Text
                  as="span"
                  className={
                    status.smsLimitReached ? styles.usageLimitReached : undefined
                  }
                >
                  {status.currentUsage?.smsUsed ?? 0}
                </Text>
              </Box>
              <Box className={styles.usageItem}>
                <Text as="span" className={styles.usageLabel}>
                  WhatsApp
                </Text>
                <Text
                  as="span"
                  className={
                    status.whatsappLimitReached ? styles.usageLimitReached : undefined
                  }
                >
                  {status.currentUsage?.whatsappUsed ?? 0}
                </Text>
              </Box>
            </Grid>
          </Box>

          <Box as="section" className={styles.section}>
            <Text as="h3" variant="heading3" className={styles.sectionTitle}>
              {status.planExpired ? 'Choose a Plan' : 'Available Plans'}
            </Text>
            <Text className={styles.sectionSubtitle}>
              Select a plan to proceed to payment
            </Text>
            <PlanGrid
              plans={plans}
              currentPlanId={status.trial ? null : status.planId}
              onSelectPlan={handleSelectPlan}
              ctaLabel={status.planExpired ? 'Select Plan' : 'Upgrade'}
              showTrialBadge
            />
          </Box>

          {statusError ? (
            <Alert variant="danger" className={styles.errorInline}>
              {statusErr instanceof Error
                ? statusErr.message
                : 'Failed to load plan status'}
            </Alert>
          ) : null}
        </Stack>
      </Box>
    </Stack>
  );
}
