'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';

import { categoryColor } from '@/lib/categories';
import { kb, modelSummary, outputLabel } from '@/lib/format';
import type { GraphEncoding, WorkflowRow } from '@/lib/types';
import { Download } from './icons';
import { ImportButton } from './import-button';
import { CategoryTile, StatusPill } from './primitives';
import { NodeGraph } from './node-graph';
import { toast } from './toast';

function downloadHref(id: string) {
  return `/api/download/${encodeURIComponent(id)}`;
}

/** Stops the row's own navigation when the download pill inside it is pressed (§6.1). */
function useStopNav() {
  return useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);
}

function DownloadPill({ id, compact = false }: { id: string; compact?: boolean }) {
  const stop = useStopNav();

  if (compact) {
    return (
      <a
        href={downloadHref(id)}
        download
        onClick={(e) => {
          stop(e);
          toast('JSON download started');
        }}
        aria-label="Download .json"
        title="Download JSON"
        className="btn-download btn-download--icon btn-download--sm"
      >
        <Download size={15} />
      </a>
    );
  }

  return (
    <>
      {/* Mobile: icon-only */}
      <a
        href={downloadHref(id)}
        download
        onClick={(e) => {
          stop(e);
          toast('JSON download started');
        }}
        aria-label="Download .json"
        title="Download JSON"
        className="btn-download btn-download--icon btn-download--sm sm:hidden"
      >
        <Download size={15} />
      </a>
      {/* Desktop: icon + label */}
      <a
        href={downloadHref(id)}
        download
        onClick={(e) => {
          stop(e);
          toast('JSON download started');
        }}
        aria-label="Download .json"
        title="Download JSON"
        className="btn-download btn-download--sm hidden sm:inline-flex"
      >
        <Download size={15} />
        <span className="font-mono text-micro">.json</span>
      </a>
    </>
  );
}

/**
 * §6.1 — the primary list row. 64px tall with a single-line title on desktop, 84px with a
 * two-line title below `sm`; category colour as a 3px left edge; and a download target that
 * does not trigger the row's navigation.
 */
export function WorkflowListRow({ row, style }: { row: WorkflowRow; style?: React.CSSProperties }) {
  const { shown, more } = modelSummary(row.models);
  const [hover, setHover] = useState(false);
  return (
    <div style={style} className="pb-2">
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="group relative flex h-[84px] items-center gap-3 overflow-hidden rounded-bento border border-edge-subtle bg-surface pr-2 transition-colors duration-hover hover:border-edge-strong hover:bg-surface-2 sm:h-16 sm:pr-3"
      >
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{ background: categoryColor(row.cat) }}
        />
        <Link
          href={`/workflow/${encodeURIComponent(row.id)}`}
          className="flex h-full min-w-0 flex-1 items-center gap-3 pl-3 focus-visible:outline-offset-[-2px]"
        >
          <CategoryTile code={row.cat} active={hover} />
          <span className="min-w-0 flex-1">
            {/* Two lines below `sm`, where a single truncated line says almost nothing. */}
            <span className="line-clamp-2 text-heading-s leading-tight text-primary sm:block sm:truncate sm:leading-normal">
              {row.title}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-small text-secondary sm:flex-nowrap sm:truncate">
              <span className="font-mono text-micro" style={{ color: categoryColor(row.cat) }}>
                {row.cat}
              </span>
              <Dot />
              <span>{outputLabel(row.out)}</span>
              <Dot />
              {/* Model names are long; they are the first thing to go on a narrow row. */}
              <span className="hidden items-center gap-1 md:flex">
                {shown.map((m, i) => (
                  <code key={m} className="font-mono text-micro text-meta">
                    {m}
                    {i < shown.length - 1 ? ',' : ''}
                  </code>
                ))}
                {more > 0 && <span className="text-micro text-meta">+{more} more</span>}
                <Dot />
              </span>
              <span className="font-mono text-micro tnum">{kb(row.kb)}</span>
            </span>
          </span>
        </Link>
        <span className="flex flex-none items-center gap-1.5">
          <ImportButton id={row.id} title={row.title} variant="icon" />
          <DownloadPill id={row.id} />
        </span>
      </div>
    </div>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-tertiary">
      ·
    </span>
  );
}

/**
 * §6.2 — grid tile. The thumbnail is the real node graph; category colour is carried by
 * the graph's generation nodes rather than a card border, so a mixed-category grid does
 * not turn into a rainbow.
 */
export function WorkflowGridTile({
  row,
  graph,
  style,
}: {
  row: WorkflowRow;
  graph?: GraphEncoding | null;
  style?: React.CSSProperties;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div style={style} className="p-1">
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="lift group flex h-full flex-col overflow-hidden rounded-bento border border-edge-subtle bg-surface"
      >
        <Link
          href={`/workflow/${encodeURIComponent(row.id)}`}
          className="flex flex-1 flex-col focus-visible:outline-offset-[-2px]"
        >
          <div className="relative h-[140px] w-full border-b border-edge-subtle bg-inset">
            {graph ? (
              <NodeGraph
                graph={graph}
                cat={row.cat}
                width={286}
                height={140}
                nodeSize={7}
                padding={14}
                className="h-full w-full"
                title={`${row.title} — pipeline diagram`}
              />
            ) : (
              <div className="grid h-full place-content-center text-micro text-meta">
                {row.nodes} nodes
              </div>
            )}
            <span className="absolute left-2 top-2">
              <CategoryTile code={row.cat} size={42} active={hover} />
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-2 p-3">
            <span className="line-clamp-2 text-small font-semibold leading-snug text-primary">
              {row.title}
            </span>
            <span className="mt-auto flex flex-wrap items-center gap-1.5">
              <StatusPill
                tone={row.out.includes('video') ? 'video' : 'image'}
                label={outputLabel(row.out)}
              />
              {row.needsInput && <StatusPill tone="ember" label="needs input" />}
              <span className="ml-auto font-mono text-micro tnum text-meta">
                {row.nodes} nodes
              </span>
            </span>
          </div>
        </Link>
        <div className="flex items-center justify-between border-t border-edge-subtle px-3 py-2">
          <span className="font-mono text-micro tnum text-meta">{kb(row.kb)}</span>
          <span className="flex items-center gap-1.5">
            <ImportButton id={row.id} title={row.title} variant="icon" />
            <DownloadPill id={row.id} compact />
          </span>
        </div>
      </div>
    </div>
  );
}

/** Compact card used by the home page strips and the related-workflows row. */
export function WorkflowMiniCard({ row }: { row: WorkflowRow }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={`/workflow/${encodeURIComponent(row.id)}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="lift group flex flex-col gap-3 rounded-bento border border-edge-subtle bg-surface p-4"
    >
      <span className="flex items-center gap-2.5">
        <CategoryTile code={row.cat} size={46} active={hover} />
        <span className="min-w-0">
          <span className="block font-mono text-micro font-semibold" style={{ color: categoryColor(row.cat) }}>
            {row.cat}
          </span>
          <span className="block truncate text-micro text-meta">{outputLabel(row.out)}</span>
        </span>
      </span>
      <span className="line-clamp-2 text-small font-semibold leading-snug text-primary">
        {row.title}
      </span>
      <span className="mt-auto flex items-center gap-2 font-mono text-micro tnum text-meta">
        <span>{row.nodes} nodes</span>
        <span aria-hidden>·</span>
        <span>{kb(row.kb)}</span>
      </span>
    </Link>
  );
}
