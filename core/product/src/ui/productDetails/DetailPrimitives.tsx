import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Box, Icon, Text, cn, productChrome, surfaceChrome } from '@inventory-platform/ui-kit';

/** Heading row of one section of the product details modal. */
export function SectionHeader({ icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <Box className={productChrome.detailSectionHeader}>
      <Box className={productChrome.detailSectionIcon} aria-hidden>
        <Icon icon={icon} size="sm" />
      </Box>
      <Text variant="heading4">{title}</Text>
    </Box>
  );
}

/**
 * One labelled cell of the details grid. Leave `label` out when the child carries its own label
 * (a form input in edit mode), so the caption is not printed twice.
 */
export function DetailField({
  icon,
  label,
  fullWidth,
  children,
}: {
  icon?: LucideIcon;
  label?: string;
  fullWidth?: boolean;
  children: ReactNode;
}) {
  return (
    <Box
      className={cn(
        productChrome.detailFieldRow,
        fullWidth ? surfaceChrome.gridSpanFull : undefined,
      )}
    >
      {icon ? (
        <Box className={productChrome.detailFieldIcon} aria-hidden>
          <Icon icon={icon} size="sm" />
        </Box>
      ) : null}
      <Box className={productChrome.detailFieldBody}>
        {label ? (
          <Text variant="caption" color="secondary">
            {label}
          </Text>
        ) : null}
        {children}
      </Box>
    </Box>
  );
}

export function DetailValue({
  children,
  weight,
}: {
  children: ReactNode;
  weight?: 'medium' | 'semibold' | 'bold';
}) {
  return <Text weight={weight}>{children}</Text>;
}
