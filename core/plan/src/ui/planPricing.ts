import type { PlanFeature, PlanResponse } from '@inventory-platform/plan/types';

/** Wording follows the 2026 brochure. */
export const FEATURE_LABELS: Record<PlanFeature, string> = {
  CREDIT_BALANCE: 'Customer credit balance',
  ACCOUNTING: 'Accounting (journal, ledgers, reports)',
  BARCODE_GENERATOR: 'Barcode label generator',
  LOW_STOCK_NOTIFICATION: 'Reminder & low-stock notifications',
  MARKETING: 'SMS / WhatsApp marketing',
  SALARY: 'Staff salary',
  BIOMETRIC_ATTENDANCE: 'Biometric attendance',
  ADVANCED_ACCESS_CONTROL: 'Advanced access control (roles & permissions)',
  SHOP_BRANDING: 'Shop logo & digital signature on invoices',
  PRIORITY_SUPPORT: 'Priority support',
};

/** Gated features that are sold but not live yet; shown with a "Coming soon" tag. */
export const COMING_SOON_FEATURES: readonly PlanFeature[] = ['MARKETING'];

/**
 * Brochure "Billing & stock" rows. The backend does not gate these (its PlanFeature enum lists
 * only what some plan lacks), so every plan includes them.
 */
export const CORE_FEATURES: readonly { key: string; label: string }[] = [
  { key: 'core-products', label: 'Products & sales, product search' },
  { key: 'core-scan-sell', label: 'Scan & Sell barcode billing' },
  { key: 'core-corrections', label: 'Pricing and stock corrections' },
  { key: 'core-parties', label: 'Vendor & customer management' },
  { key: 'core-returns', label: 'Returns to vendor and from customer' },
  { key: 'core-gst', label: 'Taxes (GST)' },
  { key: 'core-analytics', label: 'Analytics dashboard' },
  { key: 'core-history', label: 'History & audit logs' },
  { key: 'core-reminders', label: 'Reminders, low-stock alert, calculator' },
];

/** Brochure sections for the gated features, in brochure order. */
export const FEATURE_GROUPS: readonly { title: string; features: readonly PlanFeature[] }[] = [
  {
    title: 'Money & accounts',
    features: [
      'CREDIT_BALANCE',
      'ACCOUNTING',
      'BARCODE_GENERATOR',
      'SHOP_BRANDING',
      'LOW_STOCK_NOTIFICATION',
    ],
  },
  { title: 'Grow your business', features: ['MARKETING', 'SALARY', 'BIOMETRIC_ATTENDANCE'] },
  { title: 'Team & support', features: ['ADVANCED_ACCESS_CONTROL', 'PRIORITY_SUPPORT'] },
];

/**
 * Plans a shop can pick from: the API marks legacy add-on rows (e.g. "Extra User Plan")
 * `selectable: false`; add-ons only show once a plan is chosen, at payment.
 */
export function plansForSelection(plans: PlanResponse[]): PlanResponse[] {
  return plans.filter((plan) => plan.selectable !== false);
}

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
  rows: {
    key: string;
    label: string;
    /** Section title, e.g. "Plan limits" or "Billing & stock". */
    group: string;
    values: ComparisonValue[];
    comingSoon?: boolean;
  }[];
}

function limitValue(limit: number | null | undefined, unlimited: boolean, zeroLabel = '—'): string {
  if (unlimited || limit == null) return 'Unlimited';
  return limit > 0 ? limit.toLocaleString('en-IN') : zeroLabel;
}

/**
 * Catalogue plans only (legacy rows have no code), in the backend's display order. Feature rows
 * cover every gated feature any shown plan includes, so a row is never all "not included".
 */
const LIMITS_GROUP = 'Plan limits';

/** The access row covers the basic roles every plan has, so it drops the word "Advanced". */
const COMPARISON_LABELS: Partial<Record<PlanFeature, string>> = {
  ADVANCED_ACCESS_CONTROL: 'Access control (roles & permissions)',
};

function roles(count: number): string {
  return `${count} role${count === 1 ? '' : 's'}`;
}

/** A tick, a dash, or the cap the backend sent for that feature on this plan. */
function featureValue(plan: PlanResponse, feature: PlanFeature): ComparisonValue {
  const included = plan.features?.includes(feature) ?? false;
  if (feature === 'BIOMETRIC_ATTENDANCE' && included && plan.attendanceUserLimit != null) {
    return `Up to ${plan.attendanceUserLimit} users`;
  }
  if (feature === 'ADVANCED_ACCESS_CONTROL') {
    if (included)
      return plan.roleLimit != null ? `Advanced (${roles(plan.roleLimit)})` : 'Advanced';
    return plan.roleLimit != null ? `Limited (${roles(plan.roleLimit)})` : false;
  }
  return included;
}

export function buildPlanComparison(allPlans: PlanResponse[]): PlanComparison {
  const plans = allPlans
    .filter((plan) => plan.code)
    .sort((a, b) => (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity));

  const rows: PlanComparison['rows'] = [
    {
      group: LIMITS_GROUP,
      key: 'price',
      label: 'Price per year',
      values: plans.map((plan) => formatRupees(planYearlyPrice(plan))),
    },
    {
      group: LIMITS_GROUP,
      key: 'billing',
      label: 'Billing per month',
      // The API formats the monthly billing limit ("Unlimited", "₹1.5L").
      values: plans.map((plan) => plan.billingLimitLabel ?? '—'),
    },
    {
      group: LIMITS_GROUP,
      key: 'bills',
      label: 'Bills per month',
      values: plans.map((plan) => limitValue(plan.billCountLimit, plan.unlimited)),
    },
    {
      group: LIMITS_GROUP,
      key: 'users',
      label: 'Users',
      values: plans.map((plan) => limitValue(plan.userLimit, false)),
    },
    {
      group: LIMITS_GROUP,
      key: 'sms',
      label: 'SMS per month',
      values: plans.map((plan) => limitValue(plan.smsLimit, plan.unlimited)),
    },
    {
      group: LIMITS_GROUP,
      key: 'whatsapp',
      label: 'WhatsApp per month',
      values: plans.map((plan) => limitValue(plan.whatsappLimit, plan.unlimited)),
    },
    {
      group: LIMITS_GROUP,
      key: 'ocr',
      label: 'OCR invoices per month',
      values: plans.map((plan) =>
        plan.ocrLimit == null ? '—' : plan.ocrLimit.toLocaleString('en-IN'),
      ),
    },
  ];

  for (const core of CORE_FEATURES) {
    rows.push({ ...core, group: 'Billing & stock', values: plans.map(() => true) });
  }

  for (const group of FEATURE_GROUPS) {
    for (const feature of group.features) {
      const values = plans.map((plan) => featureValue(plan, feature));
      if (values.some(Boolean)) {
        rows.push({
          key: feature,
          label: COMPARISON_LABELS[feature] ?? FEATURE_LABELS[feature],
          group: group.title,
          values,
          comingSoon: COMING_SOON_FEATURES.includes(feature),
        });
      }
    }
  }

  return { plans, rows };
}
