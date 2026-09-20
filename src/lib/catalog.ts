import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import type { CategoryMeta, WorkflowDetail } from './types';

/**
 * Loads the extracted catalogue into typed-array columns once per server process.
 *
 * 52,160 rows × ~30 bytes of numeric columns is ~1.6 MB, so every filter pass is a
 * linear scan over contiguous memory — a full faceted query costs well under a
 * millisecond and needs no external search service (see §7.1 note in README).
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const SHARDS = 64;

interface RawCatalog {
  generated_at: string;
  count: number;
  dict: {
    kinds: string[];
    models: string[];
    ratios: string[];
    cats: string[];
    out: string[];
  };
  rows: [
    string, number, string, number, number[], number[],
    number, number, number[], string, string, number,
  ][];
}

interface RawFacets {
  generated_at: string;
  total: number;
  total_nodes: number;
  total_edges: number;
  total_kb: number;
  parse_errors: number;
  categories: CategoryMeta[];
  output_types: Record<string, number>;
  models: [string, number][];
  node_kinds: [string, number][];
  aspect_ratios: [string, number][];
}

export interface Catalog {
  n: number;
  generatedAt: string;
  ids: string[];
  titles: string[];
  titlesLower: string[];
  tags: string[];
  cat: Uint8Array;
  out: Uint8Array;
  nodes: Uint16Array;
  kb: Float32Array;
  modelMask: Uint16Array;
  ratioMask: Uint16Array;
  kindMask: Uint32Array;
  needsInput: Uint8Array;
  /** days since epoch, for the "newest" sort */
  day: Uint32Array;
  dict: RawCatalog['dict'];
  catIndex: Map<string, number>;
  modelIndex: Map<string, number>;
  ratioIndex: Map<string, number>;
  kindIndex: Map<string, number>;
  /** token -> sorted row indices */
  postings: Map<string, Int32Array>;
  /** document frequency per token, for idf scoring */
  facets: RawFacets;
  categories: CategoryMeta[];
  byCategory: Map<string, CategoryMeta>;
}

let cached: Catalog | null = null;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && t.length < 32);
}

function build(): Catalog {
  const raw: RawCatalog = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'catalog.json'), 'utf8'),
  );
  const facets: RawFacets = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'facets.json'), 'utf8'),
  );

  const n = raw.rows.length;
  const ids = new Array<string>(n);
  const titles = new Array<string>(n);
  const titlesLower = new Array<string>(n);
  const tags = new Array<string>(n);
  const cat = new Uint8Array(n);
  const out = new Uint8Array(n);
  const nodes = new Uint16Array(n);
  const kb = new Float32Array(n);
  const modelMask = new Uint16Array(n);
  const ratioMask = new Uint16Array(n);
  const kindMask = new Uint32Array(n);
  const needsInput = new Uint8Array(n);
  const day = new Uint32Array(n);

  // Collect postings in growable arrays first, then freeze into Int32Array.
  const postingLists = new Map<string, number[]>();

  for (let i = 0; i < n; i++) {
    const r = raw.rows[i];
    ids[i] = r[0];
    cat[i] = r[1];
    titles[i] = r[2];
    const lower = r[2].toLowerCase();
    titlesLower[i] = lower;
    nodes[i] = Math.min(r[3], 65535);
    let km = 0;
    for (const k of r[4]) km |= 1 << k;
    kindMask[i] = km >>> 0;
    let mm = 0;
    for (const m of r[5]) mm |= 1 << m;
    modelMask[i] = mm;
    out[i] = r[6];
    kb[i] = r[7];
    let rm = 0;
    for (const a of r[8]) rm |= 1 << a;
    ratioMask[i] = rm;
    tags[i] = r[9];
    day[i] = r[10] ? Math.floor(Date.parse(r[10] + 'T00:00:00Z') / 86400000) : 0;
    needsInput[i] = r[11];

    // Index title + filename tags + category code. Models and kinds are filterable
    // facets rather than free text, but their names are indexed too so that typing
    // "seedance" or "video-analyzer" into search does the obvious thing.
    const seen = new Set<string>();
    for (const t of tokenize(lower)) seen.add(t);
    for (const t of r[9].split(' ')) if (t.length > 1) seen.add(t);
    seen.add(raw.dict.cats[r[1]].toLowerCase());
    for (const m of r[5]) for (const t of tokenize(raw.dict.models[m])) seen.add(t);
    for (const k of r[4]) for (const t of tokenize(raw.dict.kinds[k])) seen.add(t);
    seen.add(raw.dict.out[r[6]].replace('+', ''));
    for (const t of seen) {
      let list = postingLists.get(t);
      if (!list) postingLists.set(t, (list = []));
      list.push(i);
    }
  }

  const postings = new Map<string, Int32Array>();
  for (const [tok, list] of postingLists) postings.set(tok, Int32Array.from(list));
  postingLists.clear();

  const categories = facets.categories;
  return {
    n,
    generatedAt: raw.generated_at,
    ids,
    titles,
    titlesLower,
    tags,
    cat,
    out,
    nodes,
    kb,
    modelMask,
    ratioMask,
    kindMask,
    needsInput,
    day,
    dict: raw.dict,
    catIndex: new Map(raw.dict.cats.map((c, i) => [c, i])),
    modelIndex: new Map(raw.dict.models.map((c, i) => [c, i])),
    ratioIndex: new Map(raw.dict.ratios.map((c, i) => [c, i])),
    kindIndex: new Map(raw.dict.kinds.map((c, i) => [c, i])),
    postings,
    facets,
    categories,
    byCategory: new Map(categories.map((c) => [c.code, c])),
  };
}

export function getCatalog(): Catalog {
  if (!cached) cached = build();
  return cached;
}

// --- detail shards -----------------------------------------------------------

const shardCache = new Map<number, Record<string, WorkflowDetail>>();

function shardOf(id: string): number {
  const h = crypto.createHash('md5').update(id).digest('hex').slice(0, 8);
  return parseInt(h, 16) % SHARDS;
}

export function getDetail(id: string): WorkflowDetail | null {
  const s = shardOf(id);
  let blob = shardCache.get(s);
  if (!blob) {
    const f = path.join(DATA_DIR, 'details', String(s).padStart(2, '0') + '.json');
    if (!fs.existsSync(f)) return null;
    blob = JSON.parse(fs.readFileSync(f, 'utf8')) as Record<string, WorkflowDetail>;
    shardCache.set(s, blob);
  }
  return blob[id] ?? null;
}

let pathMap: Record<string, string> | null = null;

/** Library-relative JSON path for a workflow id, or null when the id is unknown/unsafe. */
export function sourceRelativePath(id: string): string | null {
  if (!pathMap) {
    pathMap = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'paths.json'), 'utf8'));
  }
  const rel = pathMap![id];
  if (!rel || path.isAbsolute(rel) || rel.split(/[\\/]/).some((part) => part === '..')) return null;
  return rel.replace(/\\/g, '/');
}

/** Absolute path of the source .json for a workflow id, or null if unknown. */
export function sourcePath(id: string): string | null {
  const rel = sourceRelativePath(id);
  if (!rel) return null;
  const root =
    process.env.WORKFLOWS_LIBRARY_ROOT || path.resolve(process.cwd(), '..');
  const abs = path.resolve(root, rel);
  // Never serve outside the configured library root, whatever is in paths.json.
  if (!abs.startsWith(path.resolve(root) + path.sep)) return null;
  return abs;
}

export function getCategories(): CategoryMeta[] {
  return getCatalog().categories;
}

export function getCategory(code: string): CategoryMeta | null {
  return getCatalog().byCategory.get(code.toUpperCase()) ?? null;
}
