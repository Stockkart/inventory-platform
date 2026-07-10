import type { ReactNode } from 'react';
import { Badge, Button, Card, CardBody, Inline, Text } from '@inventory-platform/ui-kit';
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
    <Card style={{ marginBottom: '1rem' }}>
      <Button
        type="button"
        variant="ghost"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          width: '100%',
          justifyContent: 'stretch',
          padding: '0.85rem 1.25rem',
          borderRadius: 0,
          textAlign: 'left',
        }}
      >
        <Inline align="center" justify="between" style={{ width: '100%' }}>
          <Inline gap="sm" align="center">
            <Text variant="heading4" weight="semibold">
              {title}
            </Text>
            <Badge variant="neutral">({count})</Badge>
          </Inline>
          <Text
            variant="caption"
            color="secondary"
            style={{
              transition: 'transform 0.3s ease',
              transform: expanded ? 'rotate(180deg)' : undefined,
            }}
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
