import type { Config } from '@react-router/dev/config';

// Staff-only tool behind a sign-in: no SEO, so it ships as a static single-page app.
export default {
  ssr: false,
} satisfies Config;
