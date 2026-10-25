import { useNavigate } from 'react-router';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Inline,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import type { HrSetupStatusResponse } from '@inventory-platform/hr/types';

export const HR_SETTINGS_PROFILE_PATH = '/dashboard/profile?tab=hr';

export interface HrGetStartedCardProps {
  status: HrSetupStatusResponse;
  /** Opens the "Add employee" form; omitted when the user cannot add employees. */
  onAddEmployee?: () => void;
}

interface Step {
  title: string;
  description: string;
  done: boolean;
  action?: { label: string; onClick: () => void };
}

/**
 * Empty-state guide (R13.6): HR settings first, then employees, then attendance, driven by
 * `GET /hr/setup-status`. The first step that is not done is the one to do next.
 */
export function HrGetStartedCard({ status, onAddEmployee }: HrGetStartedCardProps) {
  const navigate = useNavigate();
  const steps: Step[] = [
    {
      title: 'Set your working rules',
      description: 'Weekly off days, shop hours, holidays and leave types.',
      done: status.settingsSaved,
      action: { label: 'Open HR settings', onClick: () => navigate(HR_SETTINGS_PROFILE_PATH) },
    },
    {
      title: 'Add your employees',
      description: 'Everyone who works here, with or without a login.',
      done: status.employeeCount > 0,
      action: onAddEmployee ? { label: 'Add employee', onClick: onAddEmployee } : undefined,
    },
    {
      title: 'Mark attendance',
      description: 'Mark who came in each day from the Attendance page.',
      done: status.attendanceMarked,
      action: { label: 'Mark attendance', onClick: () => navigate('/dashboard/hr/attendance') },
    },
  ];
  const nextIndex = steps.findIndex((s) => !s.done);

  return (
    <Card>
      <CardBody>
        <Stack gap="md">
          <Stack gap="xs">
            <Text variant="heading4" as="h2">
              Get started with HR
            </Text>
            <Text color="secondary">Three steps, in this order.</Text>
          </Stack>
          <Stack as="ol" gap="sm" aria-label="HR set-up steps">
            {steps.map((step, i) => (
              <Box as="li" key={step.title}>
                <Inline gap="sm" justify="between" flexWrap>
                  <Stack gap="xs">
                    <Inline gap="xs">
                      <Badge variant={step.done ? 'success' : i === nextIndex ? 'info' : 'neutral'}>
                        {step.done ? 'Done' : `Step ${i + 1}`}
                      </Badge>
                      <Text weight="semibold">{step.title}</Text>
                    </Inline>
                    <Text variant="caption" color="muted">
                      {step.description}
                    </Text>
                  </Stack>
                  {step.action && !step.done ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={i === nextIndex ? 'solid' : 'outline'}
                      onClick={step.action.onClick}
                    >
                      {step.action.label}
                    </Button>
                  ) : null}
                </Inline>
              </Box>
            ))}
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  );
}
