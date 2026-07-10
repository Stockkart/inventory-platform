import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import { plansApi } from '@inventory-platform/plan/api';
import { Alert, Box, CenteredLoader, Stack, Text } from '@inventory-platform/ui-kit';
import { PlanCarousel } from './PlanCarousel';
import styles from './Pricing.module.css';

export function Pricing() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Awaited<ReturnType<typeof plansApi.list>>>([]);
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

  const handleGetStarted = () => {
    navigate('/signup');
  };

  if (loading) {
    return (
      <Box as="section" id="pricing" className={styles.pricing}>
        <Box className={styles.container}>
          <CenteredLoader label="Loading plans..." />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box as="section" id="pricing" className={styles.pricing}>
        <Box className={styles.container}>
          <Alert variant="danger">{error}</Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box as="section" id="pricing" className={styles.pricing}>
      <Box className={styles.container}>
        <Stack gap="sm" as="header" className={styles.header}>
          <Text as="h2" variant="heading2" className={styles.title}>
            Simple, Transparent Pricing
          </Text>
          <Text className={styles.subtitle}>Choose the plan that fits your business needs</Text>
        </Stack>

        <PlanCarousel
          plans={plans}
          onSelectPlan={() => handleGetStarted()}
          ctaLabel="Get Started"
          showTrialBadge
        />
        <Box className={styles.showAllWrapper}>
          <RouterLink to="/plans" className={styles.showAllButton}>
            Show all pricing
          </RouterLink>
        </Box>
      </Box>
    </Box>
  );
}
