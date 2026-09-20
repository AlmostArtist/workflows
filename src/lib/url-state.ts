import type { NodeBucket, OutputType, Query, SortKey, ViewMode } from './types';

/**
 * §7.4 — every filter, sort, view mode and page lives in the query string, so any
 * result set is bookmarkable and browser back/forward behaves. This module is the
 * single place that shape is defined; the server route and the client both use it.
 */

export const DEFAULT_QUERY: Query = {
  q: '',
  categories: [],
  outputs: [],
  models: [],
  ratios: [],
  kinds: [],
  nodeBucket: 'any',
  needsInput: false,
  sort: 'relevance',
  page: 1,
  perPage: 40,
};

const SORTS: SortKey[] = ['relevance', 'newest', 'downloads', 'size', 'nodes'];
const BUCKETS: NodeBucket[] = ['any', 'lt10', '10-15', 'gt15'];
const OUTPUTS: OutputType[] = ['image', 'video', 'image+video'];

function list(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key);
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function parseQuery(params: URLSearchParams): Query {
  const sort = params.get('sort') as SortKey | null;
  const bucket = params.get('nodes') as NodeBucket | null;
  const outputs = list(params, 'output').filter((o): o is OutputType =>
    OUTPUTS.includes(o as OutputType),
  );
  return {
    q: params.get('q') ?? '',
    categories: list(params, 'category').map((c) => c.toUpperCase()),
    outputs,
    models: list(params, 'model'),
    ratios: list(params, 'ratio'),
    kinds: list(params, 'kind'),
    nodeBucket: bucket && BUCKETS.includes(bucket) ? bucket : 'any',
    needsInput: params.get('needs') === '1',
    sort: sort && SORTS.includes(sort) ? sort : 'relevance',
    page: Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1),
    perPage: Math.min(200, Math.max(1, parseInt(params.get('per') ?? '40', 10) || 40)),
  };
}

export function serializeQuery(q: Query, view?: ViewMode): string {
  const p = new URLSearchParams();
  if (q.q) p.set('q', q.q);
  if (q.categories.length) p.set('category', q.categories.join(','));
  if (q.outputs.length) p.set('output', q.outputs.join(','));
  if (q.models.length) p.set('model', q.models.join(','));
  if (q.ratios.length) p.set('ratio', q.ratios.join(','));
  if (q.kinds.length) p.set('kind', q.kinds.join(','));
  if (q.nodeBucket !== 'any') p.set('nodes', q.nodeBucket);
  if (q.needsInput) p.set('needs', '1');
  if (q.sort !== 'relevance') p.set('sort', q.sort);
  if (view && view !== 'list') p.set('view', view);
  if (q.page > 1) p.set('page', String(q.page));
  if (q.perPage !== 40) p.set('per', String(q.perPage));
  return p.toString();
}

export function activeFilterCount(q: Query): number {
  return (
    q.categories.length +
    q.outputs.length +
    q.models.length +
    q.ratios.length +
    q.kinds.length +
    (q.nodeBucket !== 'any' ? 1 : 0) +
    (q.needsInput ? 1 : 0)
  );
}

export function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

export const SORT_LABELS: Record<SortKey, string> = {
  relevance: 'Relevance',
  newest: 'Newest',
  downloads: 'Most downloaded',
  size: 'File size',
  nodes: 'Node count',
};
