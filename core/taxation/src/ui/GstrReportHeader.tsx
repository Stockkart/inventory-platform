import { Button, FormField, Inline, Input, Stack, Text } from '@inventory-platform/ui-kit';

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
  title: string;
  description: string;
  shopInfo?: string;
  periodId: string;
  period: string;
  onPeriodChange: (period: string) => void;
  periodDisabled?: boolean;
  downloads?: GstrDownloadAction[];
}

export function GstrReportHeader({
  title,
  description,
  shopInfo,
  periodId,
  period,
  onPeriodChange,
  periodDisabled,
  downloads = [],
}: GstrReportHeaderProps) {
  return (
    <Inline gap="md" align="start" justify="between" flexWrap>
      <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
        <Text variant="heading2">{title}</Text>
        <Text color="secondary">{description}</Text>
        {shopInfo ? (
          <Text variant="caption" color="secondary">
            {shopInfo}
          </Text>
        ) : null}
      </Stack>
      <Inline gap="md" align="center" flexWrap style={{ flexShrink: 0 }}>
        <FormField label="Period" htmlFor={periodId}>
          <Input
            id={periodId}
            type="month"
            value={period}
            onChange={(e) => onPeriodChange(e.target.value)}
            disabled={periodDisabled}
          />
        </FormField>
        {downloads.length > 0 ? (
          <Inline gap="sm" flexWrap>
            {downloads.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant={action.variant ?? 'solid'}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
                title={action.title}
              >
                {action.loading ? action.loadingLabel : action.label}
              </Button>
            ))}
          </Inline>
        ) : null}
      </Inline>
    </Inline>
  );
}
