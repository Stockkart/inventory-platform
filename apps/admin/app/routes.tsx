import type { RouteConfig } from '@react-router/dev/routes';
import { composedAdminRoutes } from '@inventory-platform/plugin-registry/admin-routes';

export default composedAdminRoutes() satisfies RouteConfig;
