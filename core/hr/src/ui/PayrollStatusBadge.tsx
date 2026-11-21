import { Badge, type BadgeVariant } from '@inventory-platform/ui-kit';
import { PAYROLL_RUN_STATUS_LABELS, type PayrollRunStatus } from '@inventory-platform/hr/types';

const VARIANT: Record<PayrollRunStatus, BadgeVariant> = {
  DRAFT: 'warning',
  FINALISING: 'info',
  FINALISED: 'success',
  REOPENING: 'info',
};

export const PAYROLL_LIST_PATH = '/dashboard/hr/payroll';

export const payrollRunPath = (runId: string) =>
  `${PAYROLL_LIST_PATH}/${encodeURIComponent(runId)}`;

/** Draft / Being finalised / Finalised / Being reopened chip. */
export function PayrollStatusBadge({ status }: { status: PayrollRunStatus }) {
  return <Badge variant={VARIANT[status]}>{PAYROLL_RUN_STATUS_LABELS[status]}</Badge>;
}
