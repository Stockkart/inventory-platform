import { Alert, Box, CenteredLoader, Stack, Text, hrChrome } from '@inventory-platform/ui-kit';
import { HR_PERMISSIONS } from '@inventory-platform/hr/types';
import { useHrAccess } from '../access/useHrAccess';
import { AttendanceCaptureCard } from './AttendanceCaptureCard';
import { useHrSettingsQuery } from '../queries/hooks';
import { HolidaysCard } from './HolidaysCard';
import { HrRolePermissionsCard } from './HrRolePermissionsCard';
import { HrSettingsForm } from './HrSettingsForm';
import { LeaveTypesCard } from './LeaveTypesCard';

/**
 * "HR" tab on the Profile page (R2, R3, R6.1, R1.3). Always listed; everyone with HR access can
 * read the settings, only MANAGE_SETTINGS can change them, and only the owner sees the role grid.
 */
export function HrSettingsSection() {
  const { can, isOwner, accessLoaded, hrEnabled } = useHrAccess();
  const readOnly = !can('MANAGE_SETTINGS');
  // `hr` is null when the member's HR switch is off: the server answers 403 for every settings
  // call then, so do not ask (self-service is unaffected). Before access loads, try anyway.
  // Self check-in alone opens no HR staff screen (the server answers 403 then too).
  const staff = HR_PERMISSIONS.some((p) => p !== 'SELF_CHECK_IN' && can(p));
  const enabled = !accessLoaded || isOwner || (hrEnabled && staff);
  const settings = useHrSettingsQuery(enabled);

  return (
    <Box className={hrChrome.hrSettingsSection}>
      <Stack gap="xs">
        <Text variant="heading3" as="h2">
          HR settings
        </Text>
        <Text color="secondary">
          Working rules, holidays and leave types used for attendance, leave and pay.
        </Text>
      </Stack>

      {!enabled ? (
        <Alert variant="info">
          {hrEnabled
            ? 'Your role has no HR settings to see. Ask the owner if you need them.'
            : 'HR is switched off for your login in this shop. Ask the owner to turn it on in Access control.'}
        </Alert>
      ) : (
        <>
          {readOnly ? (
            <Alert variant="info" role="status">
              You can see these settings but not change them. Ask the owner or someone who can
              manage HR settings to make changes.
            </Alert>
          ) : null}

          {settings.isLoading ? <CenteredLoader label="Loading HR settings…" /> : null}
          {settings.error ? <Alert variant="danger">{settings.error.message}</Alert> : null}
          {settings.data ? (
            <>
              {!settings.data.saved && !readOnly ? (
                <Alert variant="info">
                  These are the starting values. Check them and press Save working rules to begin
                  using HR.
                </Alert>
              ) : null}
              <HrSettingsForm settings={settings.data} readOnly={readOnly} />
              <AttendanceCaptureCard settings={settings.data} readOnly={readOnly} />
              <HolidaysCard readOnly={readOnly} />
              <LeaveTypesCard readOnly={readOnly} />
            </>
          ) : null}

          {isOwner ? <HrRolePermissionsCard /> : null}
        </>
      )}
    </Box>
  );
}
