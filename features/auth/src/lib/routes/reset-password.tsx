import { Header, ResetPasswordForm } from '@inventory-platform/ui';
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
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <ResetPasswordForm />
        </div>
      </main>
    </div>
  );
}
