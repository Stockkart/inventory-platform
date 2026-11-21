import {
  Alert,
  Box,
  Card,
  CardBody,
  CenteredLoader,
  PageHeader,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import {
  PHONE_STORED_ITEMS,
  RETENTION_ITEMS,
  SERVER_STORED_PER_PUNCH,
  UNPAIR_RIGHT,
} from '@inventory-platform/hr/types';
import { useConsentLatestQuery } from '../queries/hooks';
import { HrBackLink } from '../ui/HrBackLink';

export const HR_SETTINGS_PATH = '/dashboard/hr/settings';

interface PlainListProps {
  title: string;
  items: readonly string[];
}

/** A heading over a bulleted list of plain sentences. */
function PlainList({ title, items }: PlainListProps) {
  return (
    <Stack gap="xs">
      <Text variant="heading4" as="h3">
        {title}
      </Text>
      <Box as="ul" aria-label={title} pl="lg" margin="none">
        {items.map((item) => (
          <Box as="li" key={item} py="xs">
            <Text as="span">{item}</Text>
          </Box>
        ))}
      </Box>
    </Stack>
  );
}

/**
 * The one-page plain-English note about the Attendance app (R9.14), for the owner to show
 * workers. The three consent lists come from the server (the same text the phone shows at
 * pairing, R2.8), so the note and the consent screen cannot drift; the stored-items and
 * retention lists are kept in `model/attendance-app-privacy.ts`.
 */
export function AttendanceAppPrivacyPage() {
  const consent = useConsentLatestQuery();

  return (
    <Stack gap="md">
      <HrBackLink to={HR_SETTINGS_PATH} label="HR settings" />
      <PageHeader
        title="Attendance app: what is recorded"
        description="A plain-English note you can show workers before pairing their phone."
      />

      <Card>
        <CardBody>
          <Stack gap="lg">
            {consent.isLoading ? <CenteredLoader label="Loading the consent text…" /> : null}
            {consent.error ? (
              <Alert variant="danger">
                {consent.error.message || 'Could not load the consent text'}
              </Alert>
            ) : null}
            {consent.data ? (
              <>
                <PlainList title="What is recorded" items={consent.data.recorded} />
                <PlainList title="What is never recorded" items={consent.data.neverRecorded} />
                <PlainList title="Who can see it" items={consent.data.visibility} />
                <Text variant="caption" color="muted">
                  Consent text version {consent.data.version}. This is the text each worker agrees
                  to on their phone when it is paired.
                </Text>
              </>
            ) : null}
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Stack gap="lg">
            <PlainList title="What the app keeps on the phone" items={PHONE_STORED_ITEMS} />
            <PlainList
              title="What the server keeps for each check-in or check-out"
              items={SERVER_STORED_PER_PUNCH}
            />
            <PlainList title="How long it is kept" items={RETENTION_ITEMS} />
            <Stack gap="xs">
              <Text variant="heading4" as="h3">
                Your phone, your choice
              </Text>
              <Text>{UNPAIR_RIGHT}</Text>
            </Stack>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
