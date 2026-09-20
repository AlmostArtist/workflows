import 'server-only';

import { getCatalog, type Catalog } from './catalog';
import { getDownloadCount, getDownloadCounts } from './counters';
import type {
  EmptyHint,
  FacetBucket,
  NodeBucket,
  Query,
  SearchResponse,
  SuggestResponse,
  WorkflowRow,
} from './types';

export const DEFAULT_PER_PAGE = 40;

export const NODE_BUCKETS: { key: NodeBucket; label: string }[] = [
  { key: 'any', label: 'Any' },
  { key: 'lt10', label: 'Under 10' },
  { key: '10-15', label: '10 – 15' },
  { key: 'gt15', label: '15 or more' },
];

function inBucket(nodes: number, bucket: NodeBucket): boolean {
  switch (bucket) {
    case 'lt10':
      return nodes < 10;
    case '10-15':
      return nodes >= 10 && nodes <= 15;
    case 'gt15':
      return nodes > 15;
    default:
      return true;
  }
}

/** Mask built from a list of facet values; 0 means "no constraint". */
function maskOf(values: string[], index: Map<string, number>): number {
  let m = 0;
  for (const v of values) {
    const i = index.get(v);
    if (i !== undefined) m |= 1 << i;
  }
  return m;
}

// --- text matching -----------------------------------------------------------

function editDistance1(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let diffs = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++diffs > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else {
      i++;
      j++;
    }
  }
  return diffs + (a.length - i) + (b.length - j) <= 1;
}

interface TextMatch {
  /** row index -> accumulated relevance score */
  scores: Float32Array | null;
  /** rows that matched at all; null means "no text query, everything matches" */
  hits: Int32Array | null;
  /** tokens that could not be resolved even with typo tolerance */
  missing: string[];
}

/**
 * Resolves a free-text query to a scored row set.
 *
 * AND semantics across tokens, prefix expansion on the trailing token (so typeahead
 * narrows as you type), and single-edit typo tolerance on tokens that resolve to
 * nothing. Scoring is idf-weighted, with a bonus when the title itself contains the
 * raw query string — that is what pushes exact phrase matches to the top.
 */
function matchText(cat: Catalog, raw: string, allowPrefix: boolean): TextMatch {
  const q = raw.trim().toLowerCase();
  if (!q) return { scores: null, hits: null, missing: [] };

  const tokens = q.split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.length === 0) return { scores: null, hits: null, missing: [] };

  const missing: string[] = [];
  // Per token, the union of postings from every index key it resolves to.
  const perToken: { rows: Int32Array[]; df: number }[] = [];

  tokens.forEach((tok, idx) => {
    const isLast = idx === tokens.length - 1;
    const lists: Int32Array[] = [];
    const exact = cat.postings.get(tok);
    if (exact) lists.push(exact);

    // Prefix expansion — only on the trailing token, and only when the caller wants
    // it (typeahead), since expanding every token makes short queries meaningless.
    if ((allowPrefix && isLast) || !exact) {
      const wantPrefix = allowPrefix && isLast && tok.length >= 2;
      const wantFuzzy = !exact && tok.length >= 4;
      if (wantPrefix || wantFuzzy) {
        let added = 0;
        for (const [key, rows] of cat.postings) {
          if (added > 64) break;
          if (wantPrefix && key.length > tok.length && key.startsWith(tok)) {
            lists.push(rows);
            added++;
          } else if (wantFuzzy && editDistance1(tok, key)) {
            lists.push(rows);
            added++;
          }
        }
      }
    }
    if (lists.length === 0) missing.push(tok);
    perToken.push({ rows: lists, df: lists.reduce((s, l) => s + l.length, 0) });
  });

  if (missing.length) return { scores: null, hits: new Int32Array(0), missing };

  // Intersect: walk the rarest token first and verify membership in the rest.
  perToken.sort((a, b) => a.df - b.df);
  const scores = new Float32Array(cat.n);
  const N = cat.n;

  const markSets = perToken.map(({ rows }) => {
    const set = new Uint8Array(N);
    for (const list of rows) for (let i = 0; i < list.length; i++) set[list[i]] = 1;
    return set;
  });

  const idfs = perToken.map(({ df }) => Math.log(1 + N / Math.max(1, df)));
  const hits: number[] = [];
  const first = markSets[0];
  for (let i = 0; i < N; i++) {
    if (!first[i]) continue;
    let ok = true;
    for (let t = 1; t < markSets.length; t++) {
      if (!markSets[t][i]) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    let s = 0;
    for (let t = 0; t < idfs.length; t++) s += idfs[t];
    const title = cat.titlesLower[i];
    if (title.includes(q)) s += 6;
    else if (tokens.every((t) => title.includes(t))) s += 2;
    if (title.startsWith(q)) s += 3;
    // Shorter titles containing the same terms are more precise matches.
    s += 1.5 / (1 + title.length / 60);
    scores[i] = s;
    hits.push(i);
  }
  return { scores, hits: Int32Array.from(hits), missing: [] };
}

// --- main query --------------------------------------------------------------

export function runSearch(query: Query): SearchResponse {
  const t0 = performance.now();
  const cat = getCatalog();

  const catMask = maskOf(query.categories, cat.catIndex);
  const modelMask = maskOf(query.models, cat.modelIndex);
  const ratioMask = maskOf(query.ratios, cat.ratioIndex);
  const kindMask = maskOf(query.kinds, cat.kindIndex);
  const outSet = new Set(query.outputs.map((o) => cat.dict.out.indexOf(o)).filter((i) => i >= 0));

  const text = matchText(cat, query.q, false);
  const candidate = text.hits;

  // Per-dimension predicates. Facet counts for dimension D apply every predicate
  // except D's own, which is what makes the counts in the rail actionable (§7.2).
  const passCat = (i: number) => !catMask || (catMask & (1 << cat.cat[i])) !== 0;
  const passOut = (i: number) => outSet.size === 0 || outSet.has(cat.out[i]);
  const passModel = (i: number) => !modelMask || (cat.modelMask[i] & modelMask) === modelMask;
  const passRatio = (i: number) => !ratioMask || (cat.ratioMask[i] & ratioMask) !== 0;
  const passKind = (i: number) => !kindMask || (cat.kindMask[i] & kindMask) === kindMask;
  const passNodes = (i: number) => inBucket(cat.nodes[i], query.nodeBucket);
  const passInput = (i: number) => !query.needsInput || cat.needsInput[i] === 1;

  const catCounts = new Int32Array(cat.dict.cats.length);
  const outCounts = new Int32Array(cat.dict.out.length);
  const modelCounts = new Int32Array(cat.dict.models.length);
  const ratioCounts = new Int32Array(cat.dict.ratios.length);
  const nodeCounts = new Int32Array(NODE_BUCKETS.length);

  const matched: number[] = [];

  const visit = (i: number) => {
    const c = passCat(i);
    const o = passOut(i);
    const m = passModel(i);
    const r = passRatio(i);
    const k = passKind(i);
    const nb = passNodes(i);
    const ni = passInput(i);

    if (o && m && r && k && nb && ni) catCounts[cat.cat[i]]++;
    if (c && m && r && k && nb && ni) outCounts[cat.out[i]]++;
    if (c && o && r && k && nb && ni) {
      let mm = cat.modelMask[i];
      while (mm) {
        const b = mm & -mm;
        modelCounts[31 - Math.clz32(b)]++;
        mm ^= b;
      }
    }
    if (c && o && m && k && nb && ni) {
      let rm = cat.ratioMask[i];
      while (rm) {
        const b = rm & -rm;
        ratioCounts[31 - Math.clz32(b)]++;
        rm ^= b;
      }
    }
    if (c && o && m && r && k && ni) {
      const nodes = cat.nodes[i];
      nodeCounts[0]++;
      if (nodes < 10) nodeCounts[1]++;
      else if (nodes <= 15) nodeCounts[2]++;
      else nodeCounts[3]++;
    }
    if (c && o && m && r && k && nb && ni) matched.push(i);
  };

  if (candidate) for (let x = 0; x < candidate.length; x++) visit(candidate[x]);
  else for (let i = 0; i < cat.n; i++) visit(i);

  // --- sort ------------------------------------------------------------------
  const scores = text.scores;
  let downloads: Int32Array | null = null;
  if (query.sort === 'downloads') downloads = getDownloadCounts(cat.ids, matched);

  const cmp: Record<string, (a: number, b: number) => number> = {
    relevance: scores
      ? (a, b) => scores[b] - scores[a] || cat.day[b] - cat.day[a] || (a - b)
      : (a, b) => cat.cat[a] - cat.cat[b] || (cat.titlesLower[a] < cat.titlesLower[b] ? -1 : 1),
    newest: (a, b) => cat.day[b] - cat.day[a] || (a - b),
    size: (a, b) => cat.kb[b] - cat.kb[a] || (a - b),
    nodes: (a, b) => cat.nodes[b] - cat.nodes[a] || (a - b),
    downloads: (a, b) => (downloads![b] ?? 0) - (downloads![a] ?? 0) || (a - b),
  };
  matched.sort(cmp[query.sort] ?? cmp.relevance);

  const perPage = Math.min(Math.max(query.perPage || DEFAULT_PER_PAGE, 1), 200);
  const pages = Math.max(1, Math.ceil(matched.length / perPage));
  const page = Math.min(Math.max(query.page, 1), pages);
  const slice = matched.slice((page - 1) * perPage, page * perPage);

  const rows: WorkflowRow[] = slice.map((i) => toRow(cat, i));

  const bucketList = (counts: Int32Array, names: string[]): FacetBucket[] =>
    names.map((value, i) => ({ value, count: counts[i] })).filter((b) => b.count > 0 || true);

  return {
    total: matched.length,
    grandTotal: cat.n,
    page,
    pages,
    perPage,
    took: Math.round((performance.now() - t0) * 100) / 100,
    rows,
    facets: {
      categories: bucketList(catCounts, cat.dict.cats),
      outputs: bucketList(outCounts, cat.dict.out),
      models: bucketList(modelCounts, cat.dict.models).sort((a, b) => b.count - a.count),
      ratios: bucketList(ratioCounts, cat.dict.ratios).sort((a, b) => b.count - a.count),
      nodeBuckets: NODE_BUCKETS.map((b, i) => ({ value: b.key, count: nodeCounts[i] })),
    },
    hint: matched.length === 0 ? explainEmpty(query, text.missing) : null,
  };
}

export function toRow(cat: Catalog, i: number): WorkflowRow {
  const models: string[] = [];
  let mm = cat.modelMask[i];
  while (mm) {
    const b = mm & -mm;
    models.push(cat.dict.models[31 - Math.clz32(b)]);
    mm ^= b;
  }
  const ratios: string[] = [];
  let rm = cat.ratioMask[i];
  while (rm) {
    const b = rm & -rm;
    ratios.push(cat.dict.ratios[31 - Math.clz32(b)]);
    rm ^= b;
  }
  return {
    id: cat.ids[i],
    cat: cat.dict.cats[cat.cat[i]],
    title: cat.titles[i],
    nodes: cat.nodes[i],
    out: cat.dict.out[cat.out[i]] as WorkflowRow['out'],
    kb: cat.kb[i],
    models,
    ratios,
    needsInput: cat.needsInput[i] === 1,
  };
}

/**
 * §5.6 — an empty state that names the offending filter instead of shrugging.
 * Re-runs the query with each active dimension dropped in turn and reports the
 * first one that unblocks results.
 */
function explainEmpty(query: Query, missingTokens: string[]): EmptyHint {
  if (missingTokens.length) {
    return {
      message: `No workflow text matches ${missingTokens
        .map((t) => `"${t}"`)
        .join(' + ')}. Titles and tags come straight from the catalogue filenames — try a broader word, or browse by category.`,
    };
  }

  const dims: { key: keyof Query; label: string }[] = [
    { key: 'models', label: 'Model' },
    { key: 'ratios', label: 'Aspect ratio' },
    { key: 'kinds', label: 'Node kind' },
    { key: 'outputs', label: 'Output type' },
    { key: 'nodeBucket', label: 'Node count' },
    { key: 'categories', label: 'Category' },
    { key: 'needsInput', label: 'Needs input' },
  ];

  for (const d of dims) {
    const relaxed: Query = { ...query, page: 1 };
    if (d.key === 'nodeBucket') relaxed.nodeBucket = 'any';
    else if (d.key === 'needsInput') relaxed.needsInput = false;
    else (relaxed as unknown as Record<string, unknown>)[d.key] = [];
    const isActive =
      d.key === 'nodeBucket'
        ? query.nodeBucket !== 'any'
        : d.key === 'needsInput'
          ? query.needsInput
          : (query[d.key] as string[]).length > 0;
    if (!isActive) continue;

    const count = countOnly(relaxed);
    if (count > 0) {
      // When a single facet value is to blame, say where that value actually occurs —
      // "topaz only appears in collections D, K" is the fact that explains the zero.
      const values = d.key === 'nodeBucket' || d.key === 'needsInput' ? [] : (query[d.key] as string[]);
      const where =
        values.length === 1
          ? describeWhere({ dim: d.key, label: d.label, value: values[0], apply: () => {} })
          : null;
      return {
        message:
          `This filter combination returns 0 results. Clearing ${d.label} would return ` +
          `${count.toLocaleString()} ${count === 1 ? 'workflow' : 'workflows'}` +
          (where ? ` — ${where}.` : '.'),
        action: { label: `Clear ${d.label}`, drop: d.key },
      };
    }
  }
  // No single filter is responsible, so two of them conflict outright. Find the pair
  // that has no overlap at all and say where the rarer of the two actually lives —
  // that is the fact the user needs, not "no results".
  const pair = findConflictingPair(query);
  if (pair) return pair;

  return {
    message:
      'This filter combination returns 0 results. Clear all filters to start again from the full catalogue.',
    action: { label: 'Clear all filters', drop: 'categories' },
  };
}

/** One selected facet value, reduced to a query that constrains only that value. */
interface Constraint {
  dim: keyof Query;
  label: string;
  value: string;
  apply: (q: Query) => void;
}

function activeConstraints(query: Query): Constraint[] {
  const out: Constraint[] = [];
  for (const v of query.categories) {
    out.push({
      dim: 'categories',
      label: 'Category',
      value: v,
      apply: (q) => {
        q.categories = [v];
      },
    });
  }
  for (const v of query.outputs) {
    out.push({
      dim: 'outputs',
      label: 'Output type',
      value: v,
      apply: (q) => {
        q.outputs = [v];
      },
    });
  }
  for (const v of query.models) {
    out.push({
      dim: 'models',
      label: 'Model',
      value: v,
      apply: (q) => {
        q.models = [v];
      },
    });
  }
  for (const v of query.ratios) {
    out.push({
      dim: 'ratios',
      label: 'Aspect ratio',
      value: v,
      apply: (q) => {
        q.ratios = [v];
      },
    });
  }
  for (const v of query.kinds) {
    out.push({
      dim: 'kinds',
      label: 'Node kind',
      value: v,
      apply: (q) => {
        q.kinds = [v];
      },
    });
  }
  if (query.nodeBucket !== 'any') {
    out.push({
      dim: 'nodeBucket',
      label: 'Node count',
      value: NODE_BUCKETS.find((b) => b.key === query.nodeBucket)?.label ?? query.nodeBucket,
      apply: (q) => {
        q.nodeBucket = query.nodeBucket;
      },
    });
  }
  return out;
}

function findConflictingPair(query: Query): EmptyHint | null {
  const constraints = activeConstraints(query);
  if (constraints.length < 2) return null;

  const bare = (): Query => ({
    ...DEFAULT_QUERY_SHAPE,
    q: query.q,
  });

  // Count each constraint on its own so we can name the rarer one in the message.
  const solo = constraints.map((c) => {
    const q = bare();
    c.apply(q);
    return countOnly(q);
  });

  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {
      const q = bare();
      constraints[i].apply(q);
      constraints[j].apply(q);
      if (countOnly(q) > 0) continue;

      // Rarer of the two is the one worth explaining.
      const [rare, other] =
        solo[i] <= solo[j] ? [constraints[i], constraints[j]] : [constraints[j], constraints[i]];
      const rareCount = Math.min(solo[i], solo[j]);
      const otherCount = Math.max(solo[i], solo[j]);

      const where = describeWhere(rare);
      return {
        message:
          `No workflows match ${other.label} ${other.value} together with ${rare.label} ${rare.value}. ` +
          `On its own, ${rare.label} ${rare.value} returns ${rareCount.toLocaleString()} and ` +
          `${other.label} ${other.value} returns ${otherCount.toLocaleString()}, but they never overlap` +
          (where ? ` — ${where}.` : '.'),
        action: { label: `Clear ${rare.label}`, drop: rare.dim, value: rare.value },
      };
    }
  }
  return null;
}

/** "topaz only appears in collections D, J, K" — the fact that makes the conflict obvious. */
function describeWhere(c: Constraint): string | null {
  if (c.dim !== 'models' && c.dim !== 'ratios' && c.dim !== 'kinds') return null;
  const cat = getCatalog();
  const index =
    c.dim === 'models' ? cat.modelIndex : c.dim === 'ratios' ? cat.ratioIndex : cat.kindIndex;
  const bit = index.get(c.value);
  if (bit === undefined) return null;

  const column =
    c.dim === 'models' ? cat.modelMask : c.dim === 'ratios' ? cat.ratioMask : cat.kindMask;
  const mask = 1 << bit;
  const seen = new Set<string>();
  for (let i = 0; i < cat.n; i++) {
    if (column[i] & mask) seen.add(cat.dict.cats[cat.cat[i]]);
  }
  if (seen.size === 0 || seen.size === cat.dict.cats.length) return null;
  const list = Array.from(seen).sort();
  return `${c.value} only appears in ${list.length === 1 ? 'collection' : 'collections'} ${list.join(', ')}`;
}

/** Filter-free query used as the base when testing constraints in isolation. */
const DEFAULT_QUERY_SHAPE: Query = {
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

/** Count-only pass used by the empty-state explainer; skips sorting and facets. */
function countOnly(query: Query): number {
  const cat = getCatalog();
  const catMask = maskOf(query.categories, cat.catIndex);
  const modelMask = maskOf(query.models, cat.modelIndex);
  const ratioMask = maskOf(query.ratios, cat.ratioIndex);
  const kindMask = maskOf(query.kinds, cat.kindIndex);
  const outSet = new Set(query.outputs.map((o) => cat.dict.out.indexOf(o)).filter((i) => i >= 0));
  const text = matchText(cat, query.q, false);

  let count = 0;
  const check = (i: number) => {
    if (catMask && !(catMask & (1 << cat.cat[i]))) return;
    if (outSet.size && !outSet.has(cat.out[i])) return;
    if (modelMask && (cat.modelMask[i] & modelMask) !== modelMask) return;
    if (ratioMask && !(cat.ratioMask[i] & ratioMask)) return;
    if (kindMask && (cat.kindMask[i] & kindMask) !== kindMask) return;
    if (!inBucket(cat.nodes[i], query.nodeBucket)) return;
    if (query.needsInput && cat.needsInput[i] !== 1) return;
    count++;
  };
  if (text.hits) for (let x = 0; x < text.hits.length; x++) check(text.hits[x]);
  else for (let i = 0; i < cat.n; i++) check(i);
  return count;
}

// --- typeahead ---------------------------------------------------------------

export function runSuggest(q: string, limit = 6): SuggestResponse {
  const cat = getCatalog();
  const text = matchText(cat, q, true);
  if (!text.hits) return { total: 0, groups: [] };

  const scored = Array.from(text.hits);
  const scores = text.scores!;
  scored.sort((a, b) => scores[b] - scores[a]);

  const groups = new Map<string, { id: string; title: string; cat: string; out: WorkflowRow['out'] }[]>();
  for (const i of scored) {
    if (groups.size >= 4 && !groups.has(cat.dict.cats[cat.cat[i]])) continue;
    const code = cat.dict.cats[cat.cat[i]];
    const list = groups.get(code) ?? [];
    if (list.length >= 3) continue;
    list.push({
      id: cat.ids[i],
      title: cat.titles[i],
      cat: code,
      out: cat.dict.out[cat.out[i]] as WorkflowRow['out'],
    });
    groups.set(code, list);
    let shown = 0;
    for (const g of groups.values()) shown += g.length;
    if (shown >= limit) break;
  }

  return {
    total: text.hits.length,
    groups: Array.from(groups, ([code, items]) => ({ cat: code, items })),
  };
}

// --- related -----------------------------------------------------------------

/** Same category, ranked by shared filename tags — used by §5.4's related strip. */
export function relatedTo(id: string, limit = 4): WorkflowRow[] {
  const cat = getCatalog();
  const self = cat.ids.indexOf(id);
  if (self < 0) return [];
  const code = cat.cat[self];
  const mine = new Set(cat.tags[self].split(' ').filter(Boolean));

  const scored: { i: number; s: number }[] = [];
  for (let i = 0; i < cat.n; i++) {
    if (i === self || cat.cat[i] !== code) continue;
    let s = 0;
    for (const t of cat.tags[i].split(' ')) if (mine.has(t)) s++;
    if (s > 0) scored.push({ i, s });
  }
  scored.sort((a, b) => b.s - a.s || a.i - b.i);
  const picked = scored.slice(0, limit);
  if (picked.length < limit) {
    for (let i = 0; i < cat.n && picked.length < limit; i++) {
      if (i !== self && cat.cat[i] === code && !picked.some((p) => p.i === i)) {
        picked.push({ i, s: 0 });
      }
    }
  }
  return picked.map((p) => toRow(cat, p.i));
}

/**
 * Top 10 for the home page's streaming-style rail.
 *
 * When real download history exists it is the ranking, full stop. Before any downloads
 * have happened there is nothing honest to call "most downloaded", so the rail falls
 * back to a deterministic editorial ranking — the richest pipeline in each collection,
 * spread so one big collection cannot take every slot — and the caller is told which
 * basis was used so the heading can say the truth.
 */
export function topTen(limit = 10): { items: RankedRow[]; live: boolean } {
  const cat = getCatalog();
  const all = Array.from({ length: cat.n }, (_, i) => i);
  const counts = getDownloadCounts(cat.ids, all);

  const withDownloads = all.filter((i) => counts[i] > 0);
  if (withDownloads.length >= limit) {
    withDownloads.sort((a, b) => counts[b] - counts[a] || a - b);
    return {
      live: true,
      items: withDownloads.slice(0, limit).map((i, n) => ({
        ...toRow(cat, i),
        rank: n + 1,
        downloads: counts[i],
      })),
    };
  }

  // Editorial fallback: score on pipeline richness, then round-robin across collections.
  const byCat = new Map<number, number[]>();
  for (let i = 0; i < cat.n; i++) {
    const list = byCat.get(cat.cat[i]) ?? [];
    list.push(i);
    byCat.set(cat.cat[i], list);
  }
  const score = (i: number) => cat.nodes[i] * 3 + cat.kb[i];
  for (const list of byCat.values()) list.sort((a, b) => score(b) - score(a) || a - b);

  const codes = Array.from(byCat.keys()).sort((a, b) => a - b);
  const picks: number[] = [];
  for (let round = 0; picks.length < limit && round < 40; round++) {
    for (const c of codes) {
      const list = byCat.get(c)!;
      if (round < list.length) picks.push(list[round]);
      if (picks.length >= limit) break;
    }
  }

  return {
    live: false,
    items: picks.slice(0, limit).map((i, n) => ({
      ...toRow(cat, i),
      rank: n + 1,
      downloads: counts[i] ?? 0,
    })),
  };
}

export interface RankedRow extends WorkflowRow {
  rank: number;
  downloads: number;
}

/**
 * "Trending" here means recently exported, which is the only time signal the catalogue
 * actually carries — the export timestamps are real, download velocity is not yet.
 */
export function recentlyAdded(limit = 8): WorkflowRow[] {
  const cat = getCatalog();
  const all = Array.from({ length: cat.n }, (_, i) => i);
  all.sort((a, b) => cat.day[b] - cat.day[a] || score(a, b));
  function score(a: number, b: number) {
    return cat.nodes[b] - cat.nodes[a];
  }
  // Spread across collections so the strip is not eight rows of the same shape.
  const seen = new Map<number, number>();
  const out: number[] = [];
  for (const i of all) {
    const n = seen.get(cat.cat[i]) ?? 0;
    if (n >= 1) continue;
    seen.set(cat.cat[i], n + 1);
    out.push(i);
    if (out.length >= limit) break;
  }
  return out.map((i) => toRow(cat, i));
}

/** One representative workflow per collection, for the bento grid on the home page. */
export function showcasePerCategory(): Record<string, WorkflowRow> {
  const cat = getCatalog();
  const best = new Map<number, number>();
  for (let i = 0; i < cat.n; i++) {
    const cur = best.get(cat.cat[i]);
    if (cur === undefined || cat.nodes[i] > cat.nodes[cur]) best.set(cat.cat[i], i);
  }
  const out: Record<string, WorkflowRow> = {};
  for (const [c, i] of best) out[cat.dict.cats[c]] = toRow(cat, i);
  return out;
}

export { getDownloadCount };
