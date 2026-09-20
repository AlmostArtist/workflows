import { NextResponse, type NextRequest } from 'next/server';

import { runSearch } from '@/lib/search';
import { parseQuery } from '@/lib/url-state';

export const dynamic = 'force-dynamic';

/**
 * Faceted search over the whole catalogue. The query string shape is identical to the
 * one the browse page uses in its own URL (§7.4), so any browse URL can be turned into
 * an API call by swapping the path.
 */
export function GET(req: NextRequest) {
  const query = parseQuery(req.nextUrl.searchParams);
  const result = runSearch(query);
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'private, max-age=0, must-revalidate',
      'Server-Timing': `search;dur=${result.took}`,
    },
  });
}
