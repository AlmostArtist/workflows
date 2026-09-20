'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { categoryTagline, tintVars } from '@/lib/categories';
import { num } from '@/lib/format';
import { categoryLottie } from '@/lib/icon-map';
import type { CategoryMeta, GraphEncoding, WorkflowRow } from '@/lib/types';
import { LottieIcon } from './lottie';
import { NodeGraph } from './node-graph';
import { SectionHeading } from './primitives';

/**
 * Collections as a bento wall.
 *
 * Tile size follows catalogue weight rather than a decorative rhythm — the four largest
 * collections (F, G, H, I, which are 40,000 of the 52,160 files) get feature tiles with a
 * pipeline preview, and the rest read as compact tinted cards. The result is a grid that
 * tells you where the library's mass actually sits before you read a single number.
 */
export function BentoGrid({
  categories,
  showcase,
}: {
  categories: CategoryMeta[];
  showcase: Record<string, WorkflowRow>;
}) {
  const byCode = new Map(categories.map((c) => [c.code, c]));
  const featured = ['F', 'G', 'H', 'I'].map((c) => byCode.get(c)).filter(Boolean) as CategoryMeta[];
  const rest = categories.filter((c) => !featured.some((f) => f.code === c.code));

  return (
    <section className="mx-auto max-w-shell px-4 py-section sm:px-6">
      <SectionHeading
        title="14 collections"
        description="Nine parametric catalogue categories and five named system libraries, sized here by how much of the library each one holds."
        action="All collections"
        actionHref="/categories"
      />

      {/* Two rows of wide + narrow, mirrored — the four biggest collections fill the
          wall evenly instead of leaving a fourth tile stranded on its own row. */}
      <div className="mt-7 grid gap-3 md:grid-cols-3">
        {featured.map((c, i) => (
          <FeatureTile
            key={c.code}
            cat={c}
            sample={showcase[c.code]}
            delay={i * 60}
            className={i === 0 || i === 3 ? 'md:col-span-2' : ''}
          />
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {rest.map((c, i) => (
          <CompactTile key={c.code} cat={c} delay={240 + i * 40} />
        ))}
      </div>
    </section>
  );
}

function FeatureTile({
  cat,
  sample,
  delay,
  className = '',
}: {
  cat: CategoryMeta;
  sample?: WorkflowRow;
  delay: number;
  className?: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={`/categories/${cat.code}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...tintVars(cat.code), animationDelay: `${delay}ms` }}
      className={`rise lift group relative flex min-h-[236px] flex-col overflow-hidden rounded-bento border border-[var(--c-border)] bg-[var(--c-fill)] p-5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-16 w-16 flex-none place-content-center rounded-card bg-[var(--c-fill)]">
          <LottieIcon name={categoryLottie(cat.code)} size={56} active={hover} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-small font-semibold text-[var(--c-text)]">
              {cat.code}
            </span>
            <h3 className="truncate text-heading-s text-primary">{cat.name}</h3>
          </div>
          <p className="mt-0.5 text-small text-[var(--c-text)]">{categoryTagline(cat.code)}</p>
        </div>
        <span className="flex-none font-mono text-heading-s tnum text-primary">
          {num(cat.count)}
        </span>
      </div>

      <p className="mt-4 line-clamp-3 max-w-prose text-small leading-relaxed text-secondary">
        {cat.description}
      </p>

      {/* The collection's own pipeline shape, drawn from a real file in it. */}
      {sample && (
        <div className="pointer-events-none mt-auto pt-4 opacity-60 transition-opacity duration-300 group-hover:opacity-100">
          <SampleGraph code={cat.code} id={sample.id} />
        </div>
      )}
    </Link>
  );
}

/** Fetches the sample pipeline lazily — the bento wall should not block on 14 graphs. */
function SampleGraph({ code, id }: { code: string; id: string }) {
  const [graph, setGraph] = useState<GraphEncoding | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/graphs?ids=${encodeURIComponent(id)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j: Record<string, GraphEncoding>) => {
        if (j[id]) setGraph(j[id]);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [id]);

  if (!graph) return <div className="h-[56px]" />;
  return (
    <NodeGraph
      graph={graph}
      cat={code}
      width={420}
      height={56}
      nodeSize={5}
      padding={4}
      className="h-[56px] w-full"
      title={`Pipeline shape for collection ${code}`}
    />
  );
}

function CompactTile({ cat, delay }: { cat: CategoryMeta; delay: number }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={`/categories/${cat.code}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...tintVars(cat.code), animationDelay: `${delay}ms` }}
      className="rise lift group flex items-center gap-3 rounded-bento border border-[var(--c-border)] bg-[var(--c-fill)] p-3"
    >
      <span className="grid h-14 w-14 flex-none place-content-center rounded-card bg-[var(--c-fill)]">
        <LottieIcon name={categoryLottie(cat.code)} size={46} active={hover} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-micro font-semibold text-[var(--c-text)]">
            {cat.code}
          </span>
          <span className="truncate text-small font-semibold text-primary">{cat.name}</span>
        </span>
        <span className="mt-0.5 flex items-baseline gap-2">
          <span className="truncate text-small text-[var(--c-text)]">
            {categoryTagline(cat.code)}
          </span>
          <span className="ml-auto flex-none font-mono text-micro tnum text-meta">
            {num(cat.count)}
          </span>
        </span>
      </span>
    </Link>
  );
}
