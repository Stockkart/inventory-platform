import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@inventory-platform/api-client';
import { useAdminMeQuery } from '../queries/hooks';
import { adminRedirect, ADMIN_PATHS, type AdminArea } from './adminGuard';

/**
 * The signed-in admin for an area of the admin app, redirecting when the area is not allowed.
 * A 401 anywhere clears the session and returns to sign-in.
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
  const status = hasToken ? (me.isError ? 'error' : me.data ? 'ready' : 'loading') : 'idle';
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
  };
}
