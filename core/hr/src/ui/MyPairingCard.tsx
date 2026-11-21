import { useHrAccess } from '../access/useHrAccess';
import { useCreateMyPairingCodeMutation, useMyPairingQuery } from '../queries/hooks';
import { PairingPanel } from './EmployeePairingCard';

/**
 * The linked employee's own Attendance app section on My HR (R2.13): the same pairing and
 * "Replace the old phone?" flow as the manager's card, through `/hr/me/pairing*`, recorded as paired
 * by "self". Renders nothing when the login is not linked to an employee. Unpairing from here is
 * not offered: the worker removes the phone from the app itself (R3.7), a manager from the
 * employee's page.
 */
export function MyPairingCard() {
  const { employeeId } = useHrAccess();
  const linked = employeeId != null;
  const pairing = useMyPairingQuery(linked);
  const create = useCreateMyPairingCodeMutation();
  if (!linked) return null;

  return (
    <PairingPanel
      state={pairing.data}
      loading={pairing.isLoading}
      error={pairing.error}
      refetch={pairing.refetch}
      createCode={() => create.mutateAsync()}
      creating={create.isPending}
      canPair
      self
    />
  );
}
