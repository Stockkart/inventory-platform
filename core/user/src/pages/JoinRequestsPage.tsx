import { useAuthStore } from '@inventory-platform/session';
import { JoinRequestList } from '../ui';
import styles from './join-requests.module.css';

export function meta() {
  return [
    { title: 'Join Requests - StockKart' },
    { name: 'description', content: 'Manage join requests for your shop' },
  ];
}

export function JoinRequestsPage() {
  const { user } = useAuthStore();

  const shopId = user?.shopId;

  if (!shopId) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          You need to be part of a shop to manage join requests.
        </div>
      </div>
    );
  }

  // Restrict access for CASHIER role
  if (user?.role === 'CASHIER') {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          You don't have permission to manage join requests.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Join Requests</h1>
        <p className={styles.subtitle}>
          Review and manage requests from users who want to join your shop
        </p>
      </div>

      <div className={styles.content}>
        <JoinRequestList shopId={shopId} />
      </div>
    </div>
  );
}
