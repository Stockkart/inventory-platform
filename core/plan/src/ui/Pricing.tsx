import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { plansApi } from '@inventory-platform/plan/api';
import {
  Alert,
  Box,
  Button,
  CenteredLoader,
  Inline,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import { PlanCarousel } from './PlanCarousel';

const sectionStyle = {
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
} as const;

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
      <Box as="section" id="pricing" padding="xl" width="full" style={sectionStyle}>
        <CenteredLoader label="Loading plans..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box as="section" id="pricing" padding="xl" width="full" style={sectionStyle}>
        <Box maxWidth="lg" mx="auto">
          <Alert variant="danger">{error}</Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box as="section" id="pricing" padding="xl" width="full" style={sectionStyle}>
      <Stack gap="xl" maxWidth="lg" mx="auto">
        <Stack gap="sm" align="center">
          <Text as="h2" variant="heading2" align="center">
            Simple, Transparent Pricing
          </Text>
          <Text color="secondary" align="center">
            Choose the plan that fits your business needs
          </Text>
        </Stack>

        <PlanCarousel
          plans={plans}
          onSelectPlan={() => handleGetStarted()}
          ctaLabel="Get Started"
          showTrialBadge
        />

        <Inline justify="center">
          <Button variant="outline" size="lg" onClick={() => navigate('/plans')}>
            Show all pricing
          </Button>
        </Inline>
      </Stack>
    </Box>
  );
}
