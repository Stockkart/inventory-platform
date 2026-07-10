import type { ReactNode } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Inline,
  Text,
  chartChrome,
} from '@inventory-platform/ui-kit';
import type { BadgeVariant } from '@inventory-platform/ui-kit';

interface AnalyticsCollapsibleSectionProps {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function AnalyticsCollapsibleSection({
  title,
  count,
  expanded,
  onToggle,
  children,
}: AnalyticsCollapsibleSectionProps) {
  return (
    <Card className={chartChrome.collapsibleCard}>
      <Button
        type="button"
        variant="ghost"
        onClick={onToggle}
        aria-expanded={expanded}
        fullWidth
        align="start"
        className={chartChrome.collapsibleTrigger}
      >
        <Inline align="center" justify="between" width="full">
          <Inline gap="sm" align="center">
            <Text variant="heading4" weight="semibold">
              {title}
            </Text>
            <Badge variant="neutral">({count})</Badge>
          </Inline>
          <Text
            variant="caption"
            color="secondary"
            className={`${chartChrome.chevron} ${expanded ? chartChrome.chevronOpen : ''}`}
          >
            ▼
          </Text>
        </Inline>
      </Button>
      {expanded ? <CardBody>{children}</CardBody> : null}
    </Card>
  );
}

export function riskLevelBadgeVariant(level: string): BadgeVariant {
  switch (level) {
    case 'LOW':
      return 'success';
    case 'MEDIUM':
      return 'warning';
    case 'HIGH':
    case 'CRITICAL':
      return 'danger';
    default:
      return 'neutral';
  }
}
