import { useNavigate } from 'react-router';
import { Box, LinkButton, Text } from '@inventory-platform/ui-kit';
import { useHrAccess } from '../access/useHrAccess';

export const EMPLOYEES_PATH = '/dashboard/hr/employees';

export function employeePath(employeeId: string): string {
  return `${EMPLOYEES_PATH}/${employeeId}`;
}

export interface EmployeeNameLinkProps {
  employeeId: string;
  name: string;
  /** Shown after the name, small and muted (e.g. "EMP-001"). */
  code?: string | null;
}

/**
 * An employee's name in a list (run F9): a link to the employee page for people who can see
 * employees, plain text for everyone else (the page would only say "no permission"). Same link
 * look as accounting's entry numbers (ui-kit `LinkButton`).
 */
export function EmployeeNameLink({ employeeId, name, code }: EmployeeNameLinkProps) {
  const navigate = useNavigate();
  const { can } = useHrAccess();
  return (
    <Box as="span">
      {can('VIEW_EMPLOYEES') ? (
        <LinkButton onClick={() => navigate(employeePath(employeeId))}>{name}</LinkButton>
      ) : (
        <Text as="span">{name}</Text>
      )}
      {code ? (
        <Text as="span" variant="caption" color="muted">
          {' '}
          {code}
        </Text>
      ) : null}
    </Box>
  );
}
