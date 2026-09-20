import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CopyPathButton, DownloadButton } from '@/components/detail-actions';
import { ImportButton } from '@/components/import-button';
import { ChevronLeft, Warning } from '@/components/icons';
import { GraphLegend, NodeGraph } from '@/components/node-graph';
import { CategoryBadge, CategoryTile, ModelChip, OutputBadge, StatusPill } from '@/components/primitives';
import { WorkflowMiniCard } from '@/components/workflow-card';
import { getCategory, getDetail } from '@/lib/catalog';
import { categoryColor } from '@/lib/categories';
import { kb, num, plural } from '@/lib/format';
import { shapeLabel } from '@/lib/graph';
import { getDownloadCount, relatedTo } from '@/lib/search';

/**
 * §5.4 — everything on this page supports one decision: download or not.
 *
 * Detail pages are rendered on demand rather than pre-built for all 52,160 ids. The
 * data is already indexed and a render costs a single shard read, so on-demand keeps
 * builds to seconds instead of pre-generating 52k HTML files that are mostly never hit.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = getDetail(decodeURIComponent(id));
  if (!d) return { title: 'Workflow not found' };
  return { title: d.title, description: d.summary };
}

export default async function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const d = getDetail(id);
  if (!d) notFound();

  const cat = getCategory(d.cat);
  const related = relatedTo(id, 4);
  const downloads = getDownloadCount(id);
  const required = d.requires.filter((r) => r.required);
  const optional = d.requires.filter((r) => !r.required);

  return (
    <div className="mx-auto max-w-shell px-4 py-8 sm:px-6">
      <Link
        href={`/categories/${d.cat}`}
        className="inline-flex items-center gap-1.5 text-small text-secondary transition-colors duration-hover hover:text-primary"
      >
        <ChevronLeft size={15} />
        Back to {d.cat} · {cat?.name ?? d.cat}
      </Link>

      {/* --- title block --- */}
      <header className="mt-5 flex items-start gap-4">
        <CategoryTile code={d.cat} size={76} className="hidden sm:grid" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge code={d.cat} href={`/categories/${d.cat}`} size="md" />
            <OutputBadge out={d.out} />
            {d.eval && <StatusPill tone="ok" label="eval enabled" />}
            {d.requires.some((r) => r.required) && (
              <StatusPill tone="ember" label="needs input" />
            )}
          </div>
          <h1 className="mt-3 text-display-l text-primary">{d.title}</h1>

          {/* The literal pipeline string — the "what is this thing" answer. */}
          <p className="mt-4 break-words font-mono text-small text-secondary">{d.pipeline}</p>
        </div>
      </header>

      {/* --- actions --- */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <ImportButton id={d.id} title={d.title} variant="primary" />
        <DownloadButton id={d.id} sizeLabel={kb(d.kb)} />
        <CopyPathButton file={d.file} cat={d.cat} />
        {downloads > 0 && (
          <span className="ml-1 font-mono text-micro tnum text-meta">
            {num(downloads)} {plural(downloads, 'download')}
          </span>
        )}
      </div>

      {/* --- graph + pipeline facts --- */}
      <section className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="rounded-panel border border-edge-subtle bg-inset p-5">
          <NodeGraph
            graph={d.graph}
            cat={d.cat}
            width={660}
            height={300}
            nodeSize={11}
            padding={18}
            detailed
            className="h-[300px] w-full"
            title={`${d.title} — node graph`}
          />
          <div className="mt-4 border-t border-edge-subtle pt-4">
            <GraphLegend cat={d.cat} />
          </div>
        </div>

        <div className="rounded-panel border border-edge-subtle bg-surface p-5">
          <h2 className="text-heading-s text-primary">Pipeline</h2>
          <dl className="mt-4 divide-y divide-[color:var(--border-subtle)]">
            <Fact k="Nodes" v={`${num(d.nodes)} (${num(d.total_nodes)} with notes)`} />
            <Fact k="Edges" v={num(d.edges)} />
            <Fact k="Shape" v={shapeLabel(d.graph)} />
            <Fact k="Node kinds" v={String(d.kinds.length)} />
            <Fact k="File size" v={kb(d.kb)} />
            {d.ratios.length > 0 && <Fact k="Aspect ratios" v={d.ratios.join(', ')} mono />}
            {d.res.length > 0 && <Fact k="Resolution" v={d.res.join(', ')} mono />}
            {d.dur > 0 && <Fact k="Generated runtime" v={`${d.dur}s`} />}
            <Fact k="Exported" v={d.exported.slice(0, 10)} mono />
            <Fact k="Source file" v={d.file} mono wrap />
          </dl>

          <h3 className="mt-6 text-micro font-semibold uppercase tracking-[0.08em] text-meta">
            Models
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {d.models.map((m) => (
              <ModelChip key={m} name={m} />
            ))}
          </div>
        </div>
      </section>

      {/* --- what this does --- */}
      <section className="mt-10">
        <h2 className="text-heading-s text-primary">What this does</h2>
        <p className="mt-3 max-w-prose text-body text-secondary">{d.summary}</p>
        {d.notes.length > 1 && (
          <>
            <h3 className="mt-6 text-micro font-semibold uppercase tracking-[0.08em] text-meta">
              Stage notes, from the workflow&apos;s own sticky notes
            </h3>
            <ol className="mt-3 max-w-prose space-y-2">
            {d.notes.map((n, i) => (
              <li key={i} className="flex gap-3 text-small text-secondary">
                <span className="flex-none font-mono text-micro text-meta">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{n}</span>
              </li>
            ))}
            </ol>
          </>
        )}
      </section>

      {/* --- before you import (§5.4) --- */}
      {d.requires.length > 0 && (
        <section className="mt-10">
          <h2 className="text-heading-s text-primary">Before you import</h2>
          <ul className="mt-3 max-w-prose space-y-2">
            {required.map((r) => (
              <li
                key={r.name}
                className="flex items-start gap-3 rounded-card border p-3"
                style={{
                  borderColor: 'rgba(232,84,79,0.35)',
                  background: 'rgba(232,84,79,0.06)',
                }}
              >
                <Warning size={16} className="mt-0.5 flex-none text-signal-error" />
                <span className="text-small text-primary">
                  <span className="font-semibold">{r.name}</span>{' '}
                  <span className="text-secondary">
                    — paste a value into the{' '}
                    <code className="font-mono text-micro text-meta">{r.kind}</code> node&apos;s{' '}
                    <code className="font-mono text-micro text-meta">{r.field}</code> field
                    before the first run.
                  </span>
                </span>
              </li>
            ))}
            {optional.map((r) => (
              <li
                key={r.name}
                className="flex items-start gap-3 rounded-card border border-edge-subtle bg-surface p-3"
              >
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-tertiary" />
                <span className="text-small text-secondary">
                  <span className="text-primary">{r.name}</span> — left blank on purpose (
                  <code className="font-mono text-micro">{r.kind}</code>). Fill it to use your own
                  asset, or the node runs with whatever upstream supplies.
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 max-w-prose text-small text-meta">
            Anything in [square brackets] inside a prompt node is a placeholder. The workflow
            still runs if you leave it — the output will just be generic.{' '}
            <Link href="/docs/importing" className="text-ember hover:opacity-80">
              How importing works →
            </Link>
          </p>
        </section>
      )}

      {/* --- node list --- */}
      <section className="mt-10">
        <h2 className="text-heading-s text-primary">Node kinds</h2>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {d.kinds.map((k) => (
            <li key={k}>
              <Link
                href={`/browse?kind=${encodeURIComponent(k)}`}
                className="inline-block rounded-token bg-inset px-2 py-1 font-mono text-micro text-secondary transition-colors duration-hover hover:bg-surface-2 hover:text-primary"
              >
                {k}
              </Link>
            </li>
          ))}
        </ul>

        <h3 className="mt-6 text-micro font-semibold uppercase tracking-[0.08em] text-meta">
          Stages, left to right
        </h3>
        <ol className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-2">
          {d.stages.map(([k, n], i) => (
            <li key={`${k}-${i}`} className="flex items-center gap-1.5">
              <span className="rounded-token bg-surface-2 px-2 py-1 font-mono text-micro text-primary">
                {n > 1 && <span style={{ color: categoryColor(d.cat) }}>{n}× </span>}
                {k}
              </span>
              {i < d.stages.length - 1 && (
                <span aria-hidden className="text-tertiary">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* --- tags --- */}
      {d.tags.length > 0 && (
        <section className="mt-10">
          <h2 className="text-heading-s text-primary">Tags</h2>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {d.tags.map((t) => (
              <li key={t}>
                <Link
                  href={`/browse?q=${encodeURIComponent(t)}`}
                  className="inline-block rounded-chip border border-edge-subtle px-2 py-1 text-micro text-secondary transition-colors duration-hover hover:border-edge-strong hover:text-primary"
                >
                  {t}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- related --- */}
      {related.length > 0 && (
        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="text-heading-s text-primary">Related workflows</h2>
            <Link
              href={`/categories/${d.cat}`}
              className="text-small text-ember hover:opacity-80"
            >
              All of {d.cat} →
            </Link>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <li key={r.id} className="contents">
                <WorkflowMiniCard row={r} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Fact({
  k,
  v,
  mono,
  wrap,
}: {
  k: string;
  v: string;
  mono?: boolean;
  wrap?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="flex-none text-small text-secondary">{k}</dt>
      <dd
        className={`text-right text-small text-primary ${mono ? 'font-mono text-micro' : ''} ${
          wrap ? 'break-all' : 'tnum'
        }`}
      >
        {v}
      </dd>
    </div>
  );
}
