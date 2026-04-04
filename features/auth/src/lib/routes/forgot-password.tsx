import {
  FormKeyboardNavScope,
  Header,
  ForgotPasswordForm,
} from '@inventory-platform/ui';
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
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <FormKeyboardNavScope className={styles.container}>
          <ForgotPasswordForm />
        </FormKeyboardNavScope>
      </main>
    </div>
  );
}
