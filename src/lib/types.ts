/** Shapes shared between the server catalogue, the API routes and the client. */

export type OutputType = 'image' | 'video' | 'image+video';

export interface CategoryMeta {
  code: string;
  dir: string;
  name: string;
  long_name: string;
  color: string;
  icon: string;
  description: string;
  count: number;
}

/** The row shape the browse list and grid render. Deliberately small — 52k of these move. */
export interface WorkflowRow {
  id: string;
  cat: string;
  title: string;
  nodes: number;
  out: OutputType;
  kb: number;
  models: string[];
  ratios: string[];
  needsInput: boolean;
}

export interface RequiredInput {
  kind: string;
  name: string;
  field: string;
  required: boolean;
}

/** Compact layered graph; rendered to SVG by `lib/graph.ts`. */
export interface GraphEncoding {
  /** [kindIndex, layer, rankWithinLayer] */
  n: [number, number, number][];
  /** [sourceNodeIndex, targetNodeIndex] */
  e: [number, number][];
  /** node-kind names, indexed by the first element of each `n` entry */
  kinds: string[];
  /** layer count */
  L?: number;
  /** max rank across layers */
  R?: number;
}

export interface WorkflowDetail {
  id: string;
  cat: string;
  title: string;
  summary: string;
  pipeline: string;
  stages: [string, number][];
  nodes: number;
  total_nodes: number;
  edges: number;
  kinds: string[];
  models: string[];
  out: OutputType;
  kb: number;
  ratios: string[];
  res: string[];
  eval: boolean;
  dur: number;
  tags: string[];
  requires: RequiredInput[];
  exported: string;
  graph: GraphEncoding;
  file: string;
  notes: string[];
}

export type SortKey = 'relevance' | 'newest' | 'downloads' | 'size' | 'nodes';
export type ViewMode = 'list' | 'grid';
export type NodeBucket = 'any' | 'lt10' | '10-15' | 'gt15';

export interface Query {
  q: string;
  categories: string[];
  outputs: OutputType[];
  models: string[];
  ratios: string[];
  kinds: string[];
  nodeBucket: NodeBucket;
  needsInput: boolean;
  sort: SortKey;
  page: number;
  perPage: number;
}

export interface FacetBucket {
  value: string;
  count: number;
}

export interface SearchResponse {
  total: number;
  grandTotal: number;
  page: number;
  pages: number;
  perPage: number;
  took: number;
  rows: WorkflowRow[];
  facets: {
    categories: FacetBucket[];
    outputs: FacetBucket[];
    models: FacetBucket[];
    ratios: FacetBucket[];
    nodeBuckets: FacetBucket[];
  };
  /** Populated only when a query returns nothing — powers the teaching empty state (§5.6). */
  hint?: EmptyHint | null;
}

export interface EmptyHint {
  message: string;
  action?: { label: string; drop: keyof Query; value?: string };
}

export interface Suggestion {
  id: string;
  title: string;
  cat: string;
  out: OutputType;
}

export interface SuggestResponse {
  total: number;
  groups: { cat: string; items: Suggestion[] }[];
}
