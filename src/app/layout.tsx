import type { Metadata } from 'next';

import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { ToastHost } from '@/components/toast';
import { THEME_INIT_SCRIPT } from '@/components/theme';
import { getCatalog } from '@/lib/catalog';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Workflows — 52,160 workflows, ready to run',
    template: '%s · Workflows',
  },
  description:
    'Browse, filter and download 52,160 pre-built vibe-workflow-export node graphs across 14 collections. Every file is validated and importable.',
  applicationName: 'Workflows',
  other: { 'color-scheme': 'light dark' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { facets, categories } = getCatalog();
  const navCategories = categories.map((c) => ({
    code: c.code,
    name: c.name,
    count: c.count,
  }));

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;450;500;600&family=JetBrains+Mono:wght@400;450;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-card focus:bg-surface-2 focus:px-4 focus:py-2 focus:text-small"
        >
          Skip to content
        </a>
        <Nav total={facets.total} />
        <main id="main">{children}</main>
        <Footer categories={navCategories} total={facets.total} generatedAt={facets.generated_at} />
        <ToastHost />
      </body>
    </html>
  );
}
