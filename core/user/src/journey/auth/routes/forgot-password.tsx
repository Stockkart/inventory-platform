import { FormKeyboardNavScope } from '@inventory-platform/routing';
import { Box } from '@inventory-platform/ui-kit';
import { JourneyHeader } from '../../ui/JourneyHeader';
import { ForgotPasswordForm } from '../forms/ForgotPasswordForm';
import styles from './login.module.css';

export function meta() {
  return [
    { title: 'Forgot Password - StockKart' },
    {
      name: 'description',
      content: 'Reset your StockKart account password',
    },
  ];
}

export default function ForgotPasswordPage() {
  return (
    <Box className={styles.page}>
      <JourneyHeader />
      <Box as="main" className={styles.main}>
        <FormKeyboardNavScope className={styles.container}>
          <ForgotPasswordForm />
        </FormKeyboardNavScope>
      </Box>
    </Box>
  );
}
