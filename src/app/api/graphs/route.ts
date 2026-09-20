import { NextResponse, type NextRequest } from 'next/server';

import { getDetail } from '@/lib/catalog';
import type { GraphEncoding } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Graph encodings for a batch of ids. Grid view asks for the thumbnails of the rows it
 * has actually scrolled into view, which keeps the list payload small — the encodings
 * are the heaviest part of a workflow record and list view never needs them.
 */
export function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get('ids') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 60);

  const out: Record<string, GraphEncoding> = {};
  for (const id of ids) {
    const d = getDetail(id);
    if (d) out[id] = d.graph;
  }
  return NextResponse.json(out, {
    headers: { 'Cache-Control': 'private, max-age=300' },
  });
}
