import { useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/session';
import { Button, EmptyState, Stack } from '@inventory-platform/ui-kit';

/** The one sentence a WORKER login with no shop sees on the web (worker-app R2.2). */
export const NOT_IN_SHOP_MESSAGE =
  'Your account is not part of a shop yet. Ask to join from the Stockkart Team app.';

/**
 * Shown at `/dashboard/hr/me` to a WORKER login whose `/shops/me/access` failed or has no linked
 * employee (worker-app R2.2): the sentence above, and nothing else of the dashboard. Signing out is
 * the only action, so the person is not stuck on a page they cannot leave.
 */
export function NotInShopPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const signOut = async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <Stack
      align="center"
      justify="center"
      minHeight="screen"
      padding="lg"
      role="main"
      aria-label="Not part of a shop"
    >
      <EmptyState
        title="Stockkart Team"
        description={NOT_IN_SHOP_MESSAGE}
        action={
          <Button type="button" variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
        }
      />
    </Stack>
  );
}
