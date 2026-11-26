import { useId } from 'react';
import { Badge, Box, Button, Inline, Stack, Text, hrChrome } from '@inventory-platform/ui-kit';
import { EMPLOYEE_STATUS_LABELS, type PossibleMatch } from '@inventory-platform/hr/types';

export interface PossibleMatchPanelProps {
  match: PossibleMatch;
  /**
   * Given by the drawer (R4.15): the card gains **Link to existing** / **Create new** that run
   * the approval straight away. Without both, the card is read-only (the row's bulk-skip
   * highlight, a decided request).
   */
  onLink?: () => void;
  onCreate?: () => void;
  /** Which button is in flight, so it shows its spinner while the other is disabled. */
  saving?: 'LINK' | 'CREATE' | null;
  /** The last refusal (8038–8040), shown word for word under the buttons (R4.5, R4.16). */
  refusal?: string | null;
  /** Id of **Link to existing**, so the drawer can focus it when opened by a row's Approve (R4.4). */
  linkButtonId?: string;
}

/** "EMP-014 Ravi": how a match is named in the approve choice and in refusals (R4.4–R4.5). */
export function matchLabel(match: Pick<PossibleMatch, 'code' | 'name'>): string {
  return `${match.code} ${match.name}`;
}

/** The question of R4.4, kept word for word on the card. */
export function linkOrCreateQuestion(match: Pick<PossibleMatch, 'code' | 'name'>): string {
  return `Link to ${matchLabel(match)}, or create a new employee?`;
}

/**
 * The employee the shop already has with the request's email or phone (R4.3), as the highlighted
 * match card of the drawer (R4.15): code, name, status and whether a login is already linked.
 * Exactly these four facts and nothing else (R11.3). With `onLink` / `onCreate` the two inline
 * buttons are the approval; a refusal stays under them with the buttons enabled and the request
 * still Pending (R4.5).
 */
export function PossibleMatchPanel({
  match,
  onLink,
  onCreate,
  saving = null,
  refusal = null,
  linkButtonId,
}: PossibleMatchPanelProps) {
  const headingId = useId();
  const withActions = Boolean(onLink && onCreate);
  const busy = saving != null;

  return (
    <Box as="section" className={hrChrome.hrJoinMatchCard} aria-labelledby={headingId}>
      <Inline gap="sm" align="center" flexWrap>
        <Text variant="heading4" as="h3" id={headingId}>
          Possible match
        </Text>
        <Badge variant="warning">Same email or phone</Badge>
      </Inline>
      <Text variant="caption" color="secondary">
        {withActions
          ? linkOrCreateQuestion(match)
          : 'This shop already has an employee with the same email or phone number. Link the request to them, or create a new employee.'}
      </Text>
      <Inline gap="lg" flexWrap align="start">
        <Stack gap="xs">
          <Text variant="caption" color="muted">
            Employee
          </Text>
          <Text weight="semibold">{matchLabel(match)}</Text>
        </Stack>
        <Stack gap="xs">
          <Text variant="caption" color="muted">
            Status
          </Text>
          <Badge variant={match.status === 'ACTIVE' ? 'success' : 'neutral'}>
            {EMPLOYEE_STATUS_LABELS[match.status]}
          </Badge>
        </Stack>
        <Stack gap="xs">
          <Text variant="caption" color="muted">
            Linked to a login
          </Text>
          <Text>{match.linked ? 'Yes' : 'No'}</Text>
        </Stack>
      </Inline>
      {withActions ? (
        <Box className={hrChrome.hrJoinMatchCardActions}>
          <Button
            type="button"
            variant="solid"
            id={linkButtonId}
            onClick={onLink}
            loading={saving === 'LINK'}
            disabled={busy}
          >
            Link to existing
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCreate}
            loading={saving === 'CREATE'}
            disabled={busy}
          >
            Create new
          </Button>
        </Box>
      ) : null}
      {refusal ? (
        <Text variant="caption" color="danger" role="alert">
          {refusal}
        </Text>
      ) : null}
    </Box>
  );
}
