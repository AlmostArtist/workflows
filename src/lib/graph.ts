import type { GraphEncoding } from './types';

/**
 * §7.5 — deterministic node-graph rendering.
 *
 * Layout is taken straight from the workflow's own `position.x` (already stage-ordered
 * by the builder that produced the catalogue) and `position.y`. The extractor collapses
 * those into (layer, rank) pairs; this module turns them into geometry. The same input
 * always produces the same picture, so the thumbnail is a real fingerprint of the
 * pipeline rather than decoration — no two differently-shaped workflows look alike.
 */

export type NodeRole = 'input' | 'text' | 'gen' | 'transform' | 'output';

const INPUT_KINDS = new Set([
  'reference-image-input', 'image-input', 'image-input-multi', 'video-input',
  'character-input', 'background-input', 'pose-input', 'text-input',
  'aspect-ratio-input', 'select-input', 'prompt', 'pinterest-scraper',
]);
const TEXT_KINDS = new Set(['text-gen', 'prompt-enhancer', 'video-analyzer']);
const GEN_KINDS = new Set(['image-gen', 'video-gen', 'video-reference', 'video-edit', 'lyria-3']);
const OUTPUT_KINDS = new Set(['download', 'bundle']);

export function roleOf(kind: string): NodeRole {
  if (OUTPUT_KINDS.has(kind)) return 'output';
  if (GEN_KINDS.has(kind)) return 'gen';
  if (TEXT_KINDS.has(kind)) return 'text';
  if (INPUT_KINDS.has(kind)) return 'input';
  return 'transform';
}

export interface GraphStyle {
  /** Category accent — used for generation nodes and edges (§6.2). */
  accent: string;
  input: string;
  text: string;
  transform: string;
  output: string;
  edge: string;
}

/**
 * Roles resolve to theme tokens rather than literal hex, so the same diagram reads
 * correctly on graphite and on paper. The output node in particular is drawn as an open
 * stroke in the page's own text colour — as a fixed near-white it vanished in light mode.
 */
export const DEFAULT_STYLE: Omit<GraphStyle, 'accent'> = {
  input: 'var(--text-tertiary)',
  text: 'var(--ember)',
  transform: 'var(--border-strong)',
  output: 'var(--text-primary)',
  edge: 'var(--border-strong)',
};

export function fillFor(role: NodeRole, style: GraphStyle): string {
  switch (role) {
    case 'input':
      return style.input;
    case 'text':
      return style.text;
    case 'gen':
      return style.accent;
    case 'output':
      return 'transparent';
    default:
      return style.transform;
  }
}

export interface LayoutNode {
  x: number;
  y: number;
  w: number;
  h: number;
  role: NodeRole;
  kind: string;
}

export interface GraphLayout {
  width: number;
  height: number;
  nodes: LayoutNode[];
  edges: { x1: number; y1: number; x2: number; y2: number }[];
}

export interface LayoutOptions {
  width: number;
  height: number;
  nodeW?: number;
  nodeH?: number;
  padding?: number;
}

/**
 * Lays the encoded graph into a fixed viewport. Layers spread across x, ranks down y,
 * both scaled to fit — a 43-node Omni system and an 8-node reshoot both fill their box.
 */
export function layoutGraph(g: GraphEncoding, opts: LayoutOptions): GraphLayout {
  const { width, height } = opts;
  const pad = opts.padding ?? 10;
  const nodeW = opts.nodeW ?? 8;
  const nodeH = opts.nodeH ?? 8;

  if (!g?.n?.length) return { width, height, nodes: [], edges: [] };

  const layers = (g.L ?? Math.max(...g.n.map((n) => n[1])) + 1) || 1;
  const ranks = (g.R ?? Math.max(...g.n.map((n) => n[2])) + 1) || 1;

  const innerW = Math.max(1, width - pad * 2 - nodeW);
  const innerH = Math.max(1, height - pad * 2 - nodeH);
  const stepX = layers > 1 ? innerW / (layers - 1) : 0;

  const nodes: LayoutNode[] = g.n.map(([kindIdx, layer, rank]) => {
    const kind = g.kinds[kindIdx] ?? 'unknown';
    // Each layer is centred on the vertical midline and spread in proportion to how
    // full it is relative to the widest layer. A single-node layer therefore sits on
    // the spine, and a 6-way fan-out opens symmetrically around it.
    const inLayer = countInLayer(g, layer);
    const spread = inLayer > 1 ? (innerH * (inLayer - 1)) / Math.max(1, ranks - 1) : 0;
    const y = pad + innerH / 2 - spread / 2 + (inLayer > 1 ? (rank / (inLayer - 1)) * spread : 0);
    return {
      x: pad + layer * stepX,
      y,
      w: nodeW,
      h: nodeH,
      role: roleOf(kind),
      kind,
    };
  });

  const edges = g.e
    .map(([s, t]) => {
      const a = nodes[s];
      const b = nodes[t];
      if (!a || !b) return null;
      return {
        x1: a.x + nodeW,
        y1: a.y + nodeH / 2,
        x2: b.x,
        y2: b.y + nodeH / 2,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  return { width, height, nodes, edges };
}

const layerCountCache = new WeakMap<GraphEncoding, Map<number, number>>();

function countInLayer(g: GraphEncoding, layer: number): number {
  let m = layerCountCache.get(g);
  if (!m) {
    m = new Map();
    for (const [, l] of g.n) m.set(l, (m.get(l) ?? 0) + 1);
    layerCountCache.set(g, m);
  }
  return m.get(layer) ?? 1;
}

/** A short human label for the pipeline shape, e.g. "8 nodes · 4 stages · fan-out ×6". */
export function shapeLabel(g: GraphEncoding): string {
  if (!g?.n?.length) return 'empty graph';
  const layers = g.L ?? 1;
  let widest = 1;
  const perLayer = new Map<number, number>();
  for (const [, l] of g.n) {
    const c = (perLayer.get(l) ?? 0) + 1;
    perLayer.set(l, c);
    if (c > widest) widest = c;
  }
  const parts = [`${g.n.length} nodes`, `${layers} stages`];
  if (widest > 1) parts.push(`fan-out ×${widest}`);
  return parts.join(' · ');
}
