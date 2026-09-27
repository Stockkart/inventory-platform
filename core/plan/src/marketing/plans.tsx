import { Link as RouterLink, useNavigate } from 'react-router';
import { usePlansQuery } from '../queries/hooks';
import { FormKeyboardNavScope } from '@inventory-platform/routing';
import { PlanGrid, PlanComparisonTable, Header, Footer } from '../ui';
import { CampaignBanner } from '../campaign';
import { useAuthStore } from '@inventory-platform/session';
import { Alert, Box, CenteredLoader, Stack, Text } from '@inventory-platform/ui-kit';

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
  const { data: plans = [], isPending: loading, error: queryError } = usePlansQuery();
  const error = queryError ? queryError.message || 'Failed to load plans' : null;

  const handleSelectPlan = (plan: { id: string }) => {
    if (isAuthenticated) {
      navigate(`/dashboard/plan-payment?planId=${plan.id}`);
    } else {
      navigate('/signup');
    }
  };

  return (
    <Box bg="canvas" display="flex" flexDirection="column" minHeight="screen">
      <Header />
      <Box as="main" padding="xl" flex="1">
        <FormKeyboardNavScope>
          <Stack gap="xl" maxWidth="lg" mx="auto">
            <CampaignBanner ctaVariant="brand" />
            <Stack gap="sm" align="center">
              <RouterLink to="/">
                <Text color="secondary">← Back to home</Text>
              </RouterLink>
              <Text as="h1" variant="heading1" align="center">
                All Plans & Pricing
              </Text>
              <Text color="secondary" align="center">
                Choose the plan that fits your business needs
              </Text>
            </Stack>

            {loading ? <CenteredLoader label="Loading plans..." /> : null}

            {error ? <Alert variant="danger">{error}</Alert> : null}

            {!loading && !error && plans.length > 0 ? (
              <PlanGrid
                plans={plans}
                onSelectPlan={handleSelectPlan}
                ctaLabel={isAuthenticated ? 'Select Plan' : 'Get Started'}
                showTrialBadge
              />
            ) : null}

            {!loading && !error ? <PlanComparisonTable plans={plans} /> : null}
          </Stack>
        </FormKeyboardNavScope>
      </Box>
      <Footer />
    </Box>
  );
}
