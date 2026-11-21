import type { PlanResponse } from '@inventory-platform/plan/types';
import { Check } from 'lucide-react';
import {
  Badge,
  Box,
  ComparisonTable,
  Stack,
  Text,
  VisuallyHidden,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { buildPlanComparison, type ComparisonValue } from './planPricing';
import { isMostPopular } from './PlanGrid';

function renderValue(value: ComparisonValue) {
  if (value === true) {
    return (
      <>
        <Box as="span" className={surfaceChrome.planCompareTick} aria-hidden>
          <Check size={13} strokeWidth={3} />
        </Box>
        <VisuallyHidden>Included</VisuallyHidden>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <Text as="span" className={surfaceChrome.planCompareDash} aria-hidden>
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
        cornerLabel="What you get"
        columns={comparison.plans.map((plan) => ({
          key: plan.id,
          header: plan.planName,
          highlighted: isMostPopular(plan),
        }))}
        rows={comparison.rows.map((row) => ({
          key: row.key,
          group: row.group,
          label: row.comingSoon ? (
            <>
              {row.label}{' '}
              <Badge variant="warning" className={surfaceChrome.planComingSoon}>
                Coming soon
              </Badge>
            </>
          ) : (
            row.label
          ),
          cells: Object.fromEntries(
            comparison.plans.map((plan, index) => [
              plan.id,
              row.key === 'price' ? (
                <Text as="span" className={surfaceChrome.planComparePrice}>
                  {renderValue(row.values[index])}
                </Text>
              ) : (
                renderValue(row.values[index])
              ),
            ]),
          ),
        }))}
      />
    </Stack>
  );
}
