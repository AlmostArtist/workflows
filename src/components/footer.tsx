import Link from 'next/link';

import { categoryColor } from '@/lib/categories';
import { num } from '@/lib/format';

export function Footer({
  categories,
  total,
  generatedAt,
}: {
  categories: { code: string; name: string; count: number }[];
  total: number;
  generatedAt: string;
}) {
  return (
    <footer className="mt-section border-t border-edge-subtle">
      <div className="mx-auto max-w-shell px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.2fr_2fr]">
          <div>
            <span className="block font-semibold tracking-[0.14em] text-primary">WORKFLOWS</span>
            <span className="mt-0.5 block text-[11px] tracking-[0.1em] text-meta">
              by ShopOS.ai
            </span>
            <p className="mt-4 max-w-prose text-small text-secondary">
              {num(total)} pre-built <code className="font-mono text-micro">vibe-workflow-export</code>{' '}
              node graphs. Every file parses, every edge resolves, every handle matches its
              node kind.
            </p>
            <p className="mt-3 font-mono text-micro text-meta">
              Index built {generatedAt.replace('T', ' ').replace('Z', ' UTC')}
            </p>
          </div>

          <div>
            <h2 className="text-small font-semibold text-primary">Categories</h2>
            <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => (
                <li key={c.code}>
                  <Link
                    href={`/categories/${c.code}`}
                    className="group flex items-center gap-2 text-small text-secondary transition-colors duration-hover hover:text-primary"
                  >
                    <span
                      className="font-mono text-micro font-semibold"
                      style={{ color: categoryColor(c.code) }}
                    >
                      {c.code}
                    </span>
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto font-mono text-micro tnum text-meta">
                      {num(c.count)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
              <Link href="/browse" className="text-small text-secondary hover:text-primary">
                Browse
              </Link>
              <Link href="/docs/importing" className="text-small text-secondary hover:text-primary">
                Importing a workflow
              </Link>
              <a
                href="https://shopos.ai"
                className="text-small text-secondary hover:text-primary"
                rel="noreferrer"
              >
                ShopOS.ai
              </a>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
