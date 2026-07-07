import { FormKeyboardNavScope } from '@inventory-platform/routing';
import { Box } from '@inventory-platform/ui-kit';
import { JourneyHeader } from '../../ui/JourneyHeader';
import { ResetPasswordForm } from '../forms/ResetPasswordForm';
import styles from './login.module.css';

export function meta() {
  return [
    { title: 'Reset Password - StockKart' },
    {
      name: 'description',
      content: 'Set your new StockKart account password',
    },
  ];
}

export default function ResetPasswordPage() {
  return (
    <Box className={styles.page}>
      <JourneyHeader />
      <Box as="main" className={styles.main}>
        <FormKeyboardNavScope className={styles.container}>
          <ResetPasswordForm />
        </FormKeyboardNavScope>
      </Box>
    </Box>
  );
}
