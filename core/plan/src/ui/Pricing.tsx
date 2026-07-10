import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { plansApi } from '@inventory-platform/plan/api';
import {
  Alert,
  Button,
  CenteredLoader,
  Inline,
  MarketingSection,
  SectionHeading,
} from '@inventory-platform/ui-kit';
import { PlanCarousel } from './PlanCarousel';

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

  if (loading) {
    return (
      <MarketingSection id="pricing" tone="canvas" density="snug">
        <CenteredLoader label="Loading plans..." />
      </MarketingSection>
    );
  }

  if (error) {
    return (
      <MarketingSection id="pricing" tone="canvas" maxWidth="lg" density="snug">
        <Alert variant="danger">{error}</Alert>
      </MarketingSection>
    );
  }

  return (
    <MarketingSection id="pricing" tone="canvas" maxWidth="xl" density="snug">
      <SectionHeading
        title="Simple, Transparent Pricing"
        lead="Choose the plan that fits your business needs."
      />

      <PlanCarousel
        plans={plans}
        onSelectPlan={() => navigate('/signup')}
        ctaLabel="Get Started"
        showTrialBadge
      />

      <Inline justify="center">
        <Button variant="brandOutline" size="lg" onClick={() => navigate('/plans')}>
          Show all pricing
        </Button>
      </Inline>
    </MarketingSection>
  );
}
