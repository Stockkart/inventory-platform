import type { Config } from '@react-router/dev/config';

export default {
  ssr: true,
  // Send the whole route manifest with the first page instead of asking /__manifest
  // (a Netlify Function call, ~1s) as links appear. RouteChunkPreloader in
  // platform/shell needs every route in the client manifest to preload screens.
  routeDiscovery: { mode: 'initial' },
} satisfies Config;
