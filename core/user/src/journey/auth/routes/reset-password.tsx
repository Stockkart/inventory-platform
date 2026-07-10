import { FormKeyboardNavScope } from '@inventory-platform/routing';
import { Box, Stack } from '@inventory-platform/ui-kit';
import { JourneyHeader } from '../../ui/JourneyHeader';
import { ResetPasswordForm } from '../forms/ResetPasswordForm';

export function meta() {
  return [
    { title: 'Reset Password - StockKart' },
    { name: 'description', content: 'Set a new password for your StockKart account' },
  ];
}

export default function ResetPasswordPage() {
  return (
    <Stack style={{ minHeight: '100vh', paddingTop: '73px' }} bg="canvas">
      <JourneyHeader />
      <Box
        as="main"
        display="flex"
        align="center"
        justify="center"
        padding="lg"
        style={{ flex: 1 }}
      >
        <FormKeyboardNavScope>
          <Stack width="full" maxWidth="sm">
            <ResetPasswordForm />
          </Stack>
        </FormKeyboardNavScope>
      </Box>
    </Stack>
  );
}
