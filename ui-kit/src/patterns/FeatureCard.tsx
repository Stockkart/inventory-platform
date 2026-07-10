import type { ReactNode } from 'react';
import { isValidElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { Box, Text } from '../layout';
import { Icon } from '../icons';
import styles from './FeatureCard.module.css';

export interface FeatureCardProps {
  icon: ReactNode | LucideIcon;
  title: string;
  description: string;
  compact?: boolean;
  className?: string;
}

export function FeatureCard({
  icon,
  title,
  description,
  compact = false,
  className,
}: FeatureCardProps) {
  const renderedIcon = isValidElement(icon) ? icon : <Icon icon={icon as LucideIcon} size="md" />;

  return (
    <Box className={cn(styles.item, compact && styles.compact, className)}>
      <Box as="span" className={styles.iconWrap} aria-hidden>
        {renderedIcon}
      </Box>
      <Box className={styles.body}>
        <Text as="h3" className={styles.title}>
          {title}
        </Text>
        <Text as="p" className={styles.description}>
          {description}
        </Text>
      </Box>
    </Box>
  );
}
