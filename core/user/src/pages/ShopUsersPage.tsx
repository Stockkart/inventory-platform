import { useState } from 'react';
import { useAuthStore } from '@inventory-platform/session';
import { ShopUsersList } from '../ui';
import styles from './shop-users.module.css';

export function ShopUsersPage() {
  const { user } = useAuthStore();
  const [refreshKey, setRefreshKey] = useState(0);

  const shopId = user?.shopId;

  if (!shopId) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          You need to be part of a shop to view users.
        </div>
      </div>
    );
  }

  if (user?.role === 'CASHIER') {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          You don&apos;t have permission to view shop users.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Shop Users</h1>
        <p className={styles.subtitle}>
          View all users associated with your shop
        </p>
      </div>

      <div className={styles.content}>
        <ShopUsersList
          key={refreshKey}
          shopId={shopId}
          onUserChange={() => setRefreshKey((prev) => prev + 1)}
        />
      </div>
    </div>
  );
}
