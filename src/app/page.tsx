import fs from 'node:fs';
import path from 'node:path';

import Link from 'next/link';

import { BentoGrid } from '@/components/bento';
import { Hero } from '@/components/hero';
import { SectionHeading } from '@/components/primitives';
import { StepsRow } from '@/components/steps';
import { TopTen } from '@/components/top-ten';
import { WorkflowMiniCard } from '@/components/workflow-card';
import { getCatalog, getDetail } from '@/lib/catalog';
import { num } from '@/lib/format';
import { recentlyAdded, showcasePerCategory, topTen } from '@/lib/search';

export default function HomePage() {
  const { facets, categories } = getCatalog();

  // The hero prefers a real video if the owner has dropped one in; otherwise the
  // generated node-field backdrop runs. Checked here so the client never probes for a
  // file that may not exist.
  const hasVideo = fs.existsSync(path.join(process.cwd(), 'public', 'Video-wallback.mp4'));

  const { items: top, live } = topTen(10);
  const topWithGraphs = top.map((t) => ({ ...t, graph: getDetail(t.id)?.graph ?? null }));
  const recent = recentlyAdded(8);
  const showcase = showcasePerCategory();

  return (
    <>
      <Hero
        total={facets.total}
        collections={categories.length}
        nodeKinds={facets.node_kinds.length}
        hasVideo={hasVideo}
      />

      <TopTen
        items={topWithGraphs}
        title={live ? 'Top 10 this week' : 'Top 10 to start with'}
        caption={
          live
            ? 'Ranked by downloads across the whole library.'
            : 'The deepest pipeline in each collection. Switches to a live download ranking once the counters have data.'
        }
        href={live ? '/browse?sort=downloads' : '/browse?sort=nodes'}
      />

      <BentoGrid categories={categories} showcase={showcase} />

      {/* --- recently added --- */}
      <section className="mx-auto max-w-shell px-4 py-section sm:px-6">
        <SectionHeading
          title="Newest in the library"
          description="The most recent export from each collection."
          action="Browse by newest"
          actionHref="/browse?sort=newest"
        />
        <ul className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {recent.map((row, i) => (
            <li
              key={row.id}
              className="rise contents"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <WorkflowMiniCard row={row} />
            </li>
          ))}
        </ul>
      </section>

      <StepsRow />

      {/* --- closing call to action --- */}
      <section className="mx-auto max-w-shell px-4 pb-section sm:px-6">
        <div className="relative overflow-hidden rounded-panel border border-edge-subtle bg-surface p-10 text-center sm:p-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                'radial-gradient(ellipse 60% 80% at 50% 0%, var(--ember-wash), transparent 70%)',
            }}
          />
          <div className="relative">
            <h2 className="text-display-l text-primary">
              {num(facets.total)} graphs. No blank canvas.
            </h2>
            <p className="mx-auto mt-4 max-w-[52ch] text-body text-secondary">
              Every file parses, every edge resolves, every handle matches its node kind. Pick
              one, fill the inputs it names, run it.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/browse"
                className="inline-flex h-12 items-center rounded-card bg-ember px-7 text-body font-semibold text-ember-contrast shadow-lift transition-all duration-hover hover:brightness-110"
              >
                Browse the library
              </Link>
              <Link
                href="/docs/importing"
                className="inline-flex h-12 items-center rounded-card border border-edge-subtle px-7 text-body text-primary transition-colors duration-hover hover:border-edge-strong"
              >
                How importing works
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
