import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import { plansApi } from '../api';
import { FormKeyboardNavScope } from '@inventory-platform/routing';
import { PlanGrid, Header, Footer } from '../ui';
import { useAuthStore } from '@inventory-platform/session';
import {
  Alert,
  Box,
  CenteredLoader,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import styles from './plans.module.css';

export function meta() {
  return [
    { title: 'Plans & Pricing - StockKart' },
    {
      name: 'description',
      content: 'View all plans and choose the right one for your business.',
    },
  ];
}

export default function PlansPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [plans, setPlans] = useState<Awaited<ReturnType<typeof plansApi.list>>>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await plansApi.list();
        setPlans(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plans');
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSelectPlan = (plan: { id: string }) => {
    if (isAuthenticated) {
      navigate(`/dashboard/plan-payment?planId=${plan.id}`);
    } else {
      navigate('/signup');
    }
  };

  return (
    <Box className={styles.page}>
      <Header />
      <Box as="main" className={styles.main}>
        <FormKeyboardNavScope className={styles.container}>
          <Stack gap="sm" as="header" className={styles.header}>
            <RouterLink to="/" className={styles.backLink}>
              ← Back to home
            </RouterLink>
            <Text as="h1" variant="heading1" className={styles.title}>
              All Plans & Pricing
            </Text>
            <Text className={styles.subtitle}>
              Choose the plan that fits your business needs
            </Text>
          </Stack>

          {loading ? (
            <CenteredLoader label="Loading plans..." />
          ) : null}

          {error ? <Alert variant="danger">{error}</Alert> : null}

          {!loading && !error && plans.length > 0 ? (
            <PlanGrid
              plans={plans}
              onSelectPlan={handleSelectPlan}
              ctaLabel={isAuthenticated ? 'Select Plan' : 'Get Started'}
              showTrialBadge
            />
          ) : null}
        </FormKeyboardNavScope>
      </Box>
      <Footer />
    </Box>
  );
}
