import type { FeatureAvailability, PlanResponse } from '@inventory-platform/plan/types';
import {
  featureAvailability,
  featureMatrixRows,
  hasFeatureMatrix,
  sortedSubscriptionPlans,
} from '@inventory-platform/contracts';
import {
  Badge,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
} from '@inventory-platform/ui-kit';

function availabilityLabel(availability: FeatureAvailability): string {
  if (availability === 'INCLUDED') {
    return 'Included';
  }
  if (availability === 'EXCLUDED') {
    return 'Not included';
  }
  return availability.charAt(0) + availability.slice(1).toLowerCase();
}

/**
 * Graded availability renders as a badge rather than a tick, so Limited and
 * Advanced stay distinguishable at a glance.
 *
 * The glyphs are `aria-hidden` and the cell carries an `aria-label`, so screen
 * readers announce "Included" instead of a bare check mark.
 */
function AvailabilityCell({ availability }: { availability: FeatureAvailability }) {
  if (availability === 'INCLUDED') {
    return (
      <Text as="span" aria-hidden>
        ✓
      </Text>
    );
  }

  if (availability === 'EXCLUDED') {
    return (
      <Text as="span" color="secondary" aria-hidden>
        —
      </Text>
    );
  }

  return (
    <Badge variant={availability === 'ADVANCED' ? 'info' : 'neutral'}>
      {availabilityLabel(availability)}
    </Badge>
  );
}

export interface PlanComparisonProps {
  plans: PlanResponse[];
  currentPlanId?: string | null;
  /** Section heading. Rendered with the table so it cannot orphan when empty. */
  title?: string;
}

/**
 * Feature-by-tier comparison table.
 *
 * Renders nothing until the backend ships per-plan `features`, so the page
 * degrades to plan cards alone rather than showing an empty grid.
 */
export function PlanComparison({
  plans,
  currentPlanId,
  title = 'Compare plans',
}: PlanComparisonProps) {
  const corePlans = sortedSubscriptionPlans(plans);
  const rows = featureMatrixRows(corePlans);

  if (!hasFeatureMatrix(corePlans) || corePlans.length === 0 || rows.length === 0) {
    return null;
  }

  return (
    <Stack gap="md">
      <Text as="h2" variant="heading2" align="center">
        {title}
      </Text>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell scope="col">Feature</TableHeaderCell>
            {corePlans.map((plan) => (
              <TableHeaderCell
                key={plan.id}
                scope="col"
                aria-label={
                  plan.id === currentPlanId ? `${plan.planName} (current plan)` : plan.planName
                }
              >
                {plan.planName}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableHeaderCell scope="row">{row.label}</TableHeaderCell>
              {corePlans.map((plan) => {
                const availability = featureAvailability(plan, row.key);
                return (
                  <TableCell key={plan.id} aria-label={availabilityLabel(availability)}>
                    <AvailabilityCell availability={availability} />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}
