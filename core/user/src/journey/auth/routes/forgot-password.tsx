import { FormKeyboardNavScope } from '@inventory-platform/routing';
import { Box, Stack } from '@inventory-platform/ui-kit';
import { JourneyHeader } from '../../ui/JourneyHeader';
import { ForgotPasswordForm } from '../forms/ForgotPasswordForm';

export function meta() {
  return [
    { title: 'Forgot Password - StockKart' },
    { name: 'description', content: 'Reset your StockKart password' },
  ];
}

export default function ForgotPasswordPage() {
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
            <ForgotPasswordForm />
          </Stack>
        </FormKeyboardNavScope>
      </Box>
    </Stack>
  );
}
