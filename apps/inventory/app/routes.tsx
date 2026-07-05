import { type RouteConfig, route } from '@react-router/dev/routes';
import {
  composedDashboardRoutes,
  publicRoutes,
} from '@inventory-platform/plugin-registry/routes';

export default [
  ...publicRoutes(),
  route('dashboard', './routes/dashboard._layout.tsx', composedDashboardRoutes()),
] satisfies RouteConfig;
