import { categoryColor } from '@/lib/categories';
import { DEFAULT_STYLE, fillFor, layoutGraph, type GraphStyle } from '@/lib/graph';
import type { GraphEncoding } from '@/lib/types';

/**
 * §7.5 — the node-graph diagram. The pipeline is the artwork: every workflow's real
 * nodes and edges are laid out deterministically, so a 6-way catalogue fan-out and a
 * linear reshoot chain are distinguishable at 140px without any hand-made imagery.
 */
export function NodeGraph({
  graph,
  cat,
  width,
  height,
  nodeSize = 8,
  padding = 12,
  detailed = false,
  className = '',
  title,
}: {
  graph: GraphEncoding;
  cat: string;
  width: number;
  height: number;
  nodeSize?: number;
  padding?: number;
  /** Detail-page mode: thicker strokes, edge highlights, kind labels on hover. */
  detailed?: boolean;
  className?: string;
  title?: string;
}) {
  const style: GraphStyle = { ...DEFAULT_STYLE, accent: categoryColor(cat) };
  const layout = layoutGraph(graph, {
    width,
    height,
    nodeW: nodeSize,
    nodeH: nodeSize,
    padding,
  });

  if (layout.nodes.length === 0) {
    return (
      <div
        className={`grid place-content-center text-micro text-meta ${className}`}
        style={{ width, height }}
      >
        no graph
      </div>
    );
  }

  const r = Math.max(1.5, nodeSize * 0.28);
  const edgeWidth = detailed ? 1 : 0.75;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={title ?? `Pipeline diagram: ${layout.nodes.length} nodes`}
    >
      {title && <title>{title}</title>}
      <g stroke={style.edge} strokeWidth={edgeWidth} fill="none" strokeLinecap="round">
        {layout.edges.map((e, i) => {
          // Curve the control points horizontally so parallel fan-out edges stay
          // individually readable instead of collapsing into a solid wedge.
          const dx = Math.max(6, (e.x2 - e.x1) * 0.5);
          return (
            <path
              key={i}
              d={`M${e.x1} ${e.y1} C${e.x1 + dx} ${e.y1} ${e.x2 - dx} ${e.y2} ${e.x2} ${e.y2}`}
              opacity={detailed ? 0.85 : 0.7}
            />
          );
        })}
      </g>
      <g>
        {layout.nodes.map((n, i) => {
          const isOutput = n.role === 'output';
          return (
            <rect
              key={i}
              x={n.x}
              y={n.y}
              width={n.w}
              height={n.h}
              rx={r}
              fill={isOutput ? 'none' : fillFor(n.role, style)}
              stroke={isOutput ? style.output : 'none'}
              strokeWidth={isOutput ? 1.25 : 0}
            >
              {detailed && <title>{n.kind}</title>}
            </rect>
          );
        })}
      </g>
    </svg>
  );
}

/** Legend for the detail page, so the colour coding is never the only signal (§9). */
export function GraphLegend({ cat }: { cat: string }) {
  const items: { label: string; swatch: React.CSSProperties }[] = [
    { label: 'input', swatch: { background: DEFAULT_STYLE.input } },
    { label: 'text-gen', swatch: { background: DEFAULT_STYLE.text } },
    { label: 'generation', swatch: { background: categoryColor(cat) } },
    { label: 'transform', swatch: { background: DEFAULT_STYLE.transform } },
    {
      label: 'output',
      swatch: { background: 'transparent', boxShadow: `inset 0 0 0 1.25px ${DEFAULT_STYLE.output}` },
    },
  ];
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5 text-micro text-secondary">
          <span className="block h-2.5 w-2.5 rounded-[3px]" style={it.swatch} />
          <span className="font-mono">{it.label}</span>
        </li>
      ))}
    </ul>
  );
}
