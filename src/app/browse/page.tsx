import { Suspense } from 'react';

import { BrowseClient } from '@/components/browse-client';
import { runSearch } from '@/lib/search';
import { parseQuery } from '@/lib/url-state';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Browse workflows' };

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string') params.set(k, v);
    else if (Array.isArray(v) && v[0]) params.set(k, v[0]);
  }

  // Render the first page on the server so the list is present without waiting on
  // the client fetch; every change after that goes through /api/search.
  const initial = runSearch(parseQuery(params));

  return (
    <Suspense fallback={<div className="mx-auto max-w-shell px-6 py-16 text-secondary">Loading library…</div>}>
      <BrowseClient initial={initial} />
    </Suspense>
  );
}
