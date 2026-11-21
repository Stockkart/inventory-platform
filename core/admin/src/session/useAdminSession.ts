import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@inventory-platform/api-client';
import { useAdminMeQuery } from '../queries/hooks';
import { adminRedirect, adminSessionStatus, ADMIN_PATHS, type AdminArea } from './adminGuard';
import { selectAdminTokenStorage } from './adminToken';

selectAdminTokenStorage();

/**
 * The signed-in admin for an area of the admin app, redirecting when the area is not allowed.
 * A 401 anywhere clears the session and returns to sign-in; any other failure of the session check
 * leaves the admin signed in with `unavailable` set and `retry` to ask again.
 */
export function useAdminSession(area: AdminArea) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Read after mount: the token lives in localStorage, which the prerendered shell cannot see.
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    setHasToken(apiClient.hasToken());
  }, []);

  useEffect(() => {
    apiClient.setUnauthorizedHandler(() => {
      apiClient.setToken(null);
      queryClient.clear();
      navigate(ADMIN_PATHS.login, { replace: true });
    });
    return () => apiClient.setUnauthorizedHandler(null);
  }, [navigate, queryClient]);

  const me = useAdminMeQuery(hasToken === true);
  const status = adminSessionStatus({
    hasToken: hasToken === true,
    hasAdmin: me.data != null,
    error: me.error,
  });
  const redirect =
    hasToken === null
      ? null
      : adminRedirect({
          area,
          hasToken,
          status,
          mustChangePassword: me.data?.mustChangePassword,
        });

  useEffect(() => {
    if (redirect) navigate(redirect, { replace: true });
  }, [redirect, navigate]);

  return {
    admin: me.data ?? null,
    checking: hasToken === null || status === 'loading' || redirect !== null,
    /** The API could not confirm the session (server error or offline); not signed out. */
    unavailable: status === 'unavailable',
    retrying: me.isFetching,
    retry: () => void me.refetch(),
  };
}
