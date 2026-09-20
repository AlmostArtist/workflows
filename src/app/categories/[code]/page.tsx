import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { BrowseClient } from '@/components/browse-client';
import { NodeGraph } from '@/components/node-graph';
import { CategoryTile } from '@/components/primitives';
import { getCatalog, getCategory, getDetail } from '@/lib/catalog';
import { categoryTagline, tintVars } from '@/lib/categories';
import { num } from '@/lib/format';
import { runSearch } from '@/lib/search';
import { parseQuery } from '@/lib/url-state';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return getCatalog().categories.map((c) => ({ code: c.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cat = getCategory(code);
  if (!cat) return { title: 'Unknown collection' };
  return { title: `${cat.code} — ${cat.name}`, description: cat.description };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code: rawCode } = await params;
  const cat = getCategory(rawCode);
  if (!cat) notFound();

  const sp = await searchParams;
  const qp = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string') qp.set(k, v);
    else if (Array.isArray(v) && v[0]) qp.set(k, v[0]);
  }
  const query = parseQuery(qp);
  query.categories = [cat.code];
  const initial = runSearch(query);

  // A representative graph for the header — the first result's shape, which for the
  // parametric categories is the shape every file in the category shares.
  const sample = initial.rows[0] ? getDetail(initial.rows[0].id) : null;

  return (
    <>
      <header className="relative overflow-hidden border-b border-edge-subtle" style={tintVars(cat.code)}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, var(--c-fill), transparent 75%)' }}
        />
        <div className="relative mx-auto grid max-w-shell gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <CategoryTile code={cat.code} size={72} />
              <div>
                <p className="font-mono text-small font-semibold text-[var(--c-text)]">
                  {cat.code} · {categoryTagline(cat.code)}
                </p>
                <h1 className="text-display-l text-primary">{cat.name}</h1>
              </div>
            </div>
            <p className="mt-5 max-w-prose text-body text-secondary">{cat.description}</p>
            <p className="mt-4 font-mono text-small tnum text-meta">
              {num(cat.count)} workflows · source folder{' '}
              <span className="text-secondary">{cat.dir}/</span> · {cat.long_name}
            </p>
          </div>

          {sample && (
            <div className="rounded-bento border border-edge-subtle bg-inset p-4">
              <p className="text-micro font-semibold uppercase tracking-[0.1em] text-meta">
                Pipeline shape
              </p>
              <NodeGraph
                graph={sample.graph}
                cat={cat.code}
                width={420}
                height={150}
                nodeSize={9}
                padding={14}
                detailed
                className="mt-2 h-[150px] w-full"
                title={`Representative pipeline for collection ${cat.code}`}
              />
              <p className="mt-2 break-words font-mono text-micro text-meta">
                {sample.pipeline}
              </p>
            </div>
          )}
        </div>
      </header>

      <Suspense
        fallback={
          <div className="mx-auto max-w-shell px-6 py-16 text-secondary">Loading collection…</div>
        }
      >
        <BrowseClient
          initial={initial}
          lockedCategory={cat.code}
          heading={`Browse ${cat.name}`}
        />
      </Suspense>
    </>
  );
}
