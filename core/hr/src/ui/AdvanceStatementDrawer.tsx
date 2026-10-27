import { useId } from 'react';
import { Box, Drawer, IconButton, Inline, Stack, Text, hrChrome } from '@inventory-platform/ui-kit';
import { AdvanceStatementTable } from './AdvanceStatementTable';

export interface AdvanceStatementDrawerProps {
  /** null = closed. */
  employee: { employeeId: string; name: string; code?: string | null } | null;
  onClose: () => void;
}

/** Side drawer with one employee's advance statement (R7.5), opened from the advances list. */
export function AdvanceStatementDrawer({ employee, onClose }: AdvanceStatementDrawerProps) {
  const titleId = useId();
  return (
    <Drawer open={employee != null} onClose={onClose} side="right" labelledBy={titleId}>
      {employee ? (
        <Box className={hrChrome.hrDayDrawer}>
          <Inline justify="between" align="start" gap="sm">
            <Stack gap="xs">
              <Text variant="heading4" as="h2" id={titleId}>
                Advance statement: {employee.name}
              </Text>
              {employee.code ? <Text color="secondary">{employee.code}</Text> : null}
            </Stack>
            <IconButton label="Close advance statement" onClick={onClose}>
              ×
            </IconButton>
          </Inline>
          <AdvanceStatementTable employeeId={employee.employeeId} />
        </Box>
      ) : null}
    </Drawer>
  );
}
