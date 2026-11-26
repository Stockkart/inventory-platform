import { Button, Card, CardBody, Inline, Stack, Text } from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import { formatInstantDate, type EmployeeResponse } from '@inventory-platform/hr/types';
import { useHrAccess } from '../access/useHrAccess';
import { useRequestProfileMutation } from '../queries/hooks';

export interface RequestProfileButtonProps {
  employee: EmployeeResponse;
}

/**
 * "Request profile details" on the employee page (worker-app R8.7): sets the server's
 * profile-requested flag, which notifies the worker and shows a badge in their app. Only for
 * someone with ADD_EDIT_EMPLOYEES and only for an employee with a linked login, since there is
 * nobody to ask otherwise. Once asked, the card says when ("Requested on 12 May 2026", Indian
 * calendar day) instead of offering the button again; collecting the details is a later version.
 */
export function RequestProfileButton({ employee }: RequestProfileButtonProps) {
  const { can } = useHrAccess();
  const request = useRequestProfileMutation();

  if (!can('ADD_EDIT_EMPLOYEES') || !employee.userId) return null;

  const handleRequest = () => {
    request.mutate(employee.id, {
      onSuccess: () => useNotify.success(`Asked ${employee.name} for their profile details`),
      onError: (err) => useNotify.error(err.message || 'Could not request the profile details'),
    });
  };

  return (
    <Card>
      <CardBody>
        <Inline gap="sm" justify="between" flexWrap>
          <Stack gap="xs">
            <Text variant="heading4" as="h3">
              Profile details
            </Text>
            <Text variant="caption" color="muted">
              Asks the worker to complete their profile in the Stockkart Team app.
            </Text>
          </Stack>
          {employee.profileRequestedAt ? (
            <Text>Requested on {formatInstantDate(employee.profileRequestedAt)}</Text>
          ) : (
            <Button
              type="button"
              variant="outline"
              loading={request.isPending}
              onClick={handleRequest}
            >
              Request profile details
            </Button>
          )}
        </Inline>
      </CardBody>
    </Card>
  );
}
