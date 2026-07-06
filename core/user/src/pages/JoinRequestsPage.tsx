import {
  Alert,
  Card,
  CardBody,
  PageHeader,
  Stack,
} from '@inventory-platform/ui-kit';
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
      <Stack gap="md" className={styles.container}>
        <Alert variant="danger">
          You need to be part of a shop to manage join requests.
        </Alert>
      </Stack>
    );
  }

  if (user?.role === 'CASHIER') {
    return (
      <Stack gap="md" className={styles.container}>
        <Alert variant="danger">
          You don&apos;t have permission to manage join requests.
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="md" className={styles.container}>
      <PageHeader
        title="Join Requests"
        description="Review and manage requests from users who want to join your shop"
      />

      <Card className={styles.content}>
        <CardBody>
          <JoinRequestList shopId={shopId} />
        </CardBody>
      </Card>
    </Stack>
  );
}
