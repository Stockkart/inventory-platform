import type { ReactNode } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Inline,
  Text,
} from '@inventory-platform/ui-kit';
import type { BadgeVariant } from '@inventory-platform/ui-kit';
import styles from './analytics.module.css';

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
    <Card className={styles.accordionItem}>
      <Button
        type="button"
        variant="ghost"
        className={styles.accordionHeader}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <Inline align="center" justify="between" className={styles.accordionHeaderInner}>
          <Inline gap="sm" align="center">
            <Text variant="heading4" weight="semibold">
              {title}
            </Text>
            <Badge variant="neutral">({count})</Badge>
          </Inline>
          <Text
            variant="caption"
            color="secondary"
            className={expanded ? styles.accordionIconExpanded : styles.accordionIcon}
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
