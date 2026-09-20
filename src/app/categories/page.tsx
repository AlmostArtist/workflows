import Link from 'next/link';

import { CategoryTile } from '@/components/primitives';
import { getCatalog } from '@/lib/catalog';
import { categoryTagline, tintVars } from '@/lib/categories';
import { num } from '@/lib/format';

export const metadata = {
  title: 'Collections',
  description: 'All 14 workflow collections in the Workflows library.',
};

export default function CategoriesPage() {
  const { categories, facets } = getCatalog();

  return (
    <div className="mx-auto max-w-shell px-4 py-12 sm:px-6">
      <h1 className="text-display-l text-primary">Collections</h1>
      <p className="mt-4 max-w-prose text-body text-secondary">
        {num(facets.total)} workflows across {categories.length} collections. Nine are the
        parametric catalogue categories (A–I); the remaining five (J–N) are the named system
        libraries that ship alongside them, with deeper graphs and hand-written titles.
      </p>

      <ul className="mt-10 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((c) => (
          <li key={c.code}>
            <Link
              href={`/categories/${c.code}`}
              style={tintVars(c.code)}
              className="lift group flex h-full flex-col gap-4 rounded-bento border border-[var(--c-border)] bg-[var(--c-fill)] p-5"
            >
              <div className="flex items-start gap-3">
                <CategoryTile code={c.code} size={60} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-small font-semibold text-[var(--c-text)]">
                      {c.code}
                    </span>
                    <h2 className="truncate text-heading-s text-primary">{c.name}</h2>
                  </div>
                  <p className="mt-0.5 text-small text-[var(--c-text)]">
                    {categoryTagline(c.code)}
                  </p>
                </div>
                <span className="flex-none font-mono text-heading-s tnum text-primary">
                  {num(c.count)}
                </span>
              </div>
              <p className="max-w-prose text-small leading-relaxed text-secondary">
                {c.description}
              </p>
              <p className="mt-auto font-mono text-micro text-meta">{c.dir}/</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
