import { NextResponse, type NextRequest } from 'next/server';

import { runSuggest } from '@/lib/search';

export const dynamic = 'force-dynamic';

/** Typeahead for the ⌘K palette and the browse search field (§6.7). */
export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (q.trim().length < 2) return NextResponse.json({ total: 0, groups: [] });
  return NextResponse.json(runSuggest(q, 6));
}
