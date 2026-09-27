import type { PlanFeature, PlanResponse } from '@inventory-platform/plan/types';

export const FEATURE_LABELS: Record<PlanFeature, string> = {
  CREDIT_BALANCE: 'Credit balance',
  ACCOUNTING: 'Accounting',
  BARCODE_GENERATOR: 'Barcode generator',
  LOW_STOCK_NOTIFICATION: 'Reminder & low-stock notifications',
  MARKETING: 'Marketing (SMS/WhatsApp)',
  SALARY: 'Salary',
  BIOMETRIC_ATTENDANCE: 'Biometric attendance',
  ADVANCED_ACCESS_CONTROL: 'Advanced access control',
};

export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** What the plan is sold for per year. */
export function planYearlyPrice(plan: PlanResponse): number {
  return plan.arcPrice ?? plan.price ?? 0;
}

/** The anchor only shows when the backend sent one above the real price. */
export function planListPriceLabel(plan: PlanResponse): string | null {
  const listPrice = plan.listPrice;
  if (listPrice == null || listPrice <= planYearlyPrice(plan)) return null;
  return formatRupees(listPrice);
}

/** true/false render as included / not included. */
export type ComparisonValue = string | boolean;

export interface PlanComparison {
  plans: PlanResponse[];
  rows: { key: string; label: string; values: ComparisonValue[] }[];
}

function limitValue(limit: number | null | undefined, unlimited: boolean, zeroLabel = '—'): string {
  if (unlimited || limit == null) return 'Unlimited';
  return limit > 0 ? limit.toLocaleString('en-IN') : zeroLabel;
}

/**
 * Catalogue plans only (legacy rows have no code), in the backend's display order. Feature rows
 * cover every gated feature any shown plan includes, so a row is never all "not included".
 */
export function buildPlanComparison(allPlans: PlanResponse[]): PlanComparison {
  const plans = allPlans
    .filter((plan) => plan.code)
    .sort((a, b) => (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity));

  const rows: PlanComparison['rows'] = [
    {
      key: 'price',
      label: 'Price per year',
      values: plans.map((plan) => formatRupees(planYearlyPrice(plan))),
    },
    {
      key: 'billing',
      label: 'Billing per month',
      values: plans.map((plan) =>
        plan.unlimited || plan.billingLimit == null
          ? 'Unlimited'
          : `₹${(plan.billingLimit / 100000).toFixed(1)}L`,
      ),
    },
    {
      key: 'bills',
      label: 'Bills per month',
      values: plans.map((plan) => limitValue(plan.billCountLimit, plan.unlimited)),
    },
    {
      key: 'users',
      label: 'Users',
      values: plans.map((plan) => limitValue(plan.userLimit, false)),
    },
    {
      key: 'sms',
      label: 'SMS per month',
      values: plans.map((plan) => limitValue(plan.smsLimit, plan.unlimited)),
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp per month',
      values: plans.map((plan) => limitValue(plan.whatsappLimit, plan.unlimited)),
    },
    {
      key: 'ocr',
      label: 'OCR invoices per month',
      values: plans.map((plan) =>
        plan.ocrLimit == null ? '—' : plan.ocrLimit.toLocaleString('en-IN'),
      ),
    },
  ];

  for (const feature of Object.keys(FEATURE_LABELS) as PlanFeature[]) {
    const values = plans.map((plan) => plan.features?.includes(feature) ?? false);
    if (values.some(Boolean)) {
      rows.push({ key: feature, label: FEATURE_LABELS[feature], values });
    }
  }

  return { plans, rows };
}
