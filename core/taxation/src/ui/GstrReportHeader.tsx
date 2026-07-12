import { Button, Inline, Input, PageHeader, accountingChrome } from '@inventory-platform/ui-kit';

export interface GstrDownloadAction {
  label: string;
  loadingLabel: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'solid' | 'outline';
  title?: string;
}

export interface GstrReportHeaderProps {
  description: string;
  periodId: string;
  period: string;
  onPeriodChange: (period: string) => void;
  periodDisabled?: boolean;
  downloads?: GstrDownloadAction[];
}

export function GstrReportHeader({
  description,
  periodId,
  period,
  onPeriodChange,
  periodDisabled,
  downloads = [],
}: GstrReportHeaderProps) {
  return (
    <PageHeader
      description={description}
      actions={
        <Inline gap="sm" align="center">
          <Input
            id={periodId}
            aria-label="Report period"
            type="month"
            value={period}
            onChange={(e) => onPeriodChange(e.target.value)}
            disabled={periodDisabled}
            className={accountingChrome.tbAsOfInput}
          />
          {downloads.map((action) => (
            <Button
              key={action.label}
              type="button"
              variant={action.variant ?? 'solid'}
              onClick={action.onClick}
              disabled={action.disabled}
              title={action.title}
            >
              {action.loading ? action.loadingLabel : action.label}
            </Button>
          ))}
        </Inline>
      }
    />
  );
}
