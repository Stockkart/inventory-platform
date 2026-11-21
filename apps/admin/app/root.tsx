import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type MetaFunction,
  type LinksFunction,
} from 'react-router';
import { ThemeProvider, ToastProvider } from '@inventory-platform/shell';
import { QueryProvider } from '@inventory-platform/query';
import '../styles.css';

export const meta: MetaFunction = () => [
  { title: 'StockKart Admin' },
  { name: 'robots', content: 'noindex, nofollow' },
];

// Set by the Netlify build (VITE_BUILD_SHA=$COMMIT_REF, apps/admin/netlify.toml) so the live
// commit can be checked; 'local' for dev builds. Rendered in Layout, as in the shop app.
const BUILD_SHA = import.meta.env.VITE_BUILD_SHA || 'local';

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
    type: 'image/svg+xml',
  },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400..800;1,400..800&display=swap',
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="build-sha" content={BUILD_SHA} />
        <Meta />
        <Links />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme) {
                    document.documentElement.setAttribute('data-theme', theme);
                  } else {
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <QueryProvider>
          <ThemeProvider>
            {children}
            <ToastProvider />
          </ThemeProvider>
        </QueryProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return null;
}

export default function App() {
  return <Outlet />;
}
