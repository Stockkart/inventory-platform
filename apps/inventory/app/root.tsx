import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type MetaFunction,
  type LinksFunction,
} from 'react-router';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider, AuthInitializer } from '@inventory-platform/shell';
import { QueryProvider } from '@inventory-platform/query';
import '../styles.css';

export const meta: MetaFunction = () => [
  {
    title: 'StockKart - Complete Inventory Management Solution',
  },
  {
    name: 'description',
    content:
      'Streamline your business operations with our comprehensive inventory management platform.',
  },
];

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
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
          <QueryProvider>
            <ThemeProvider>
              <AuthInitializer>{children}</AuthInitializer>
            </ThemeProvider>
          </QueryProvider>
        </GoogleOAuthProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
