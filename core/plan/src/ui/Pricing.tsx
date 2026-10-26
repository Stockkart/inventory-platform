import { useNavigate } from 'react-router';
import {
  Alert,
  Button,
  CenteredLoader,
  Inline,
  MarketingSection,
  SectionHeading,
} from '@inventory-platform/ui-kit';
import { usePlansQuery } from '../queries/hooks';
import { PlanCarousel } from './PlanCarousel';

export function Pricing() {
  const navigate = useNavigate();
  const { data: plans = [], isPending: loading, error: queryError } = usePlansQuery();
  const error = queryError ? queryError.message || 'Failed to load plans' : null;

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
