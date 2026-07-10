import { Stack, Text } from '../layout';
import { cn } from '../utils/cn';
import styles from './SectionHeading.module.css';

export interface SectionHeadingProps {
  title: string;
  lead?: string;
  className?: string;
}

export function SectionHeading({ title, lead, className }: SectionHeadingProps) {
  return (
    <Stack gap="sm" align="center" className={cn(styles.heading, className)}>
      <Text as="h2" className={styles.title}>
        {title}
      </Text>
      {lead ? (
        <Text as="p" className={styles.lead}>
          {lead}
        </Text>
      ) : null}
    </Stack>
  );
}
