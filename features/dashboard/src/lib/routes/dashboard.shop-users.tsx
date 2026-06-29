import { useState } from 'react';
import { useAuthStore } from '@inventory-platform/store';
import { ShopUsersList } from '@inventory-platform/ui';
import styles from './dashboard.shop-users.module.css';

export function meta() {
  return [
    { title: 'Shop Users - StockKart' },
    {
      name: 'description',
      content: 'View and manage team members working in your shop',
    },
  ];
}

export default function ShopUsersPage() {
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

  // Restrict access for CASHIER role
  if (user?.role === 'CASHIER') {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          You don't have permission to view shop users.
        </div>
      </div>
    );
  }

  const handleUserChange = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Shop Users</h1>
        <p className={styles.subtitle}>
          View and manage team members working in your shop
        </p>
      </div>

      <div className={styles.content}>
        <ShopUsersList
          key={refreshKey}
          shopId={shopId}
          onUserChange={handleUserChange}
        />
      </div>
    </div>
  );
}
