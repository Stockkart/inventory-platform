import type { PlanResponse } from '@inventory-platform/plan/types';
import { ComparisonTable, Stack, Text, VisuallyHidden } from '@inventory-platform/ui-kit';
import { buildPlanComparison, type ComparisonValue } from './planPricing';
import { isMostPopular } from './PlanGrid';

function renderValue(value: ComparisonValue) {
  if (value === true) {
    return (
      <>
        <Text as="span" aria-hidden>
          ✓
        </Text>
        <VisuallyHidden>Included</VisuallyHidden>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <Text as="span" color="secondary" aria-hidden>
          —
        </Text>
        <VisuallyHidden>Not included</VisuallyHidden>
      </>
    );
  }
  return value;
}

export interface PlanComparisonTableProps {
  plans: PlanResponse[];
}

/** Side-by-side plan limits and features. Renders nothing with fewer than two catalogue plans. */
export function PlanComparisonTable({ plans }: PlanComparisonTableProps) {
  const comparison = buildPlanComparison(plans);
  if (comparison.plans.length < 2) return null;

  return (
    <Stack gap="md">
      <Text as="h2" variant="heading2" align="center">
        Compare plans
      </Text>
      <ComparisonTable
        caption="Plan limits and features side by side"
        cornerLabel="Features"
        columns={comparison.plans.map((plan) => ({
          key: plan.id,
          header: plan.planName,
          highlighted: isMostPopular(plan),
        }))}
        rows={comparison.rows.map((row) => ({
          key: row.key,
          label: row.label,
          cells: Object.fromEntries(
            comparison.plans.map((plan, index) => [plan.id, renderValue(row.values[index])]),
          ),
        }))}
      />
    </Stack>
  );
}
