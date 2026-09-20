import Link from 'next/link';

import { Rule } from '@/components/primitives';
import { getCatalog } from '@/lib/catalog';
import { num } from '@/lib/format';

export const metadata = {
  title: 'Importing a workflow',
  description:
    'How to import a vibe-workflow-export JSON, what the blank input nodes mean, and which handles to verify on your first run.',
};

export default function ImportingDocsPage() {
  const { facets } = getCatalog();
  const kinds = facets.node_kinds;
  const models = facets.models;

  return (
    <div className="mx-auto max-w-shell px-4 py-12 sm:px-6">
      <div className="max-w-prose">
        <h1 className="text-display-l text-primary">Importing a workflow</h1>
        <p className="mt-4 text-body text-secondary">
          Every file in this library is a complete{' '}
          <code className="rounded-token bg-inset px-1.5 py-0.5 font-mono text-micro">
            vibe-workflow-export
          </code>{' '}
          document: a <code className="font-mono text-micro">format</code>/
          <code className="font-mono text-micro">formatVersion</code>/
          <code className="font-mono text-micro">exportedAt</code>/
          <code className="font-mono text-micro">doc</code> envelope wrapping a node graph.
          Download it, import it, fill in the blanks, run it.
        </p>
      </div>

      <Section n="01" title="Download and import">
        <p>
          Press <strong className="text-primary">Download .json</strong> on any workflow page.
          The file that lands is the exact file from the catalogue — nothing is repackaged on
          the way out. Import it through your platform&apos;s workflow import, and the graph
          arrives with every node positioned as it was authored.
        </p>
      </Section>

      <Section n="02" title="Fill the blank input nodes">
        <p>
          Input nodes that need one of your own assets ship <em>blank on purpose</em> — no
          invented URLs. A workflow page lists them under{' '}
          <strong className="text-primary">Before you import</strong>, and the filter rail has a{' '}
          <strong className="text-primary">Needs an input URL</strong> toggle if you want to see
          which workflows have them.
        </p>
        <ul className="mt-4 space-y-2">
          <li>
            A name ending in <code className="font-mono text-micro text-signal-error">*</code>{' '}
            means the workflow will not produce anything useful until you supply a value —
            typically a product image or a source clip.
          </li>
          <li>
            A name without a star is optional: the node has an upstream feed, and your value
            overrides it.
          </li>
          <li>
            Text in <code className="font-mono text-micro">[square brackets]</code> inside a
            prompt node is a placeholder. The workflow runs without editing it; the output is
            just generic.
          </li>
        </ul>
      </Section>

      <Section n="03" title="Verify three handles on your first import">
        <p>
          Three handles in the catalogue were carried over from older exports and had no
          working edge in the sample the generator was reverse-engineered from. Import one file
          of each type first and confirm the edge survives the round trip:
        </p>
        <ul className="mt-4 space-y-2">
          <li>
            <code className="font-mono text-micro">video-analyzer → text</code> — used across
            collection F.{' '}
            <Link href="/browse?category=F" className="text-ember hover:opacity-80">
              Browse F →
            </Link>
          </li>
          <li>
            <code className="font-mono text-micro">video-gen ← first_frame</code> — used by the
            collection I files whose names end{' '}
            <code className="font-mono text-micro">-hook-first-frame</code>.{' '}
            <Link
              href="/browse?q=hook+first+frame&category=I"
              className="text-ember hover:opacity-80"
            >
              Browse those →
            </Link>
          </li>
          <li>
            <code className="font-mono text-micro">lyria-3 → audio</code> — used by the
            collection I files ending{' '}
            <code className="font-mono text-micro">-text-reveal</code>.{' '}
            <Link href="/browse?q=text+reveal&category=I" className="text-ember hover:opacity-80">
              Browse those →
            </Link>
          </li>
        </ul>
        <p className="mt-4">
          Everything else uses handles confirmed against real exports.
        </p>
      </Section>

      <Section n="04" title="Raise the output tier after import">
        <p>
          Enum and numeric config fields are set only to values confirmed present in real
          platform exports — <code className="font-mono text-micro">resolution: 720p</code>,{' '}
          <code className="font-mono text-micro">image_size: 1K</code>,{' '}
          <code className="font-mono text-micro">upscale_factor: 2x</code>,{' '}
          <code className="font-mono text-micro">prompt_expansion_mode: balanced</code>. That
          keeps import risk at zero. Raise them in the UI after import if your account supports
          higher tiers.
        </p>
      </Section>

      <Rule className="my-section" />

      {/* --- reference tables --- */}
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-heading-s text-primary">
            Node kinds in this library ({kinds.length})
          </h2>
          <p className="mt-2 max-w-prose text-small text-secondary">
            Counted by how many workflows use each kind at least once. Every entry links to a
            filtered browse.
          </p>
          <ul className="mt-4 divide-y divide-[color:var(--border-subtle)]">
            {kinds.map(([kind, count]) => (
              <li key={kind}>
                <Link
                  href={`/browse?kind=${encodeURIComponent(kind)}`}
                  className="flex items-center justify-between gap-4 py-2 transition-colors duration-hover hover:text-primary"
                >
                  <code className="font-mono text-micro text-secondary">{kind}</code>
                  <span className="font-mono text-micro tnum text-meta">{num(count)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-heading-s text-primary">Models referenced ({models.length})</h2>
          <p className="mt-2 max-w-prose text-small text-secondary">
            These are literal{' '}
            <code className="font-mono text-micro">config.model</code> strings. No legacy
            per-model video node kinds appear anywhere — all video runs through{' '}
            <code className="font-mono text-micro">video-gen</code> /{' '}
            <code className="font-mono text-micro">video-reference</code> /{' '}
            <code className="font-mono text-micro">video-edit</code> with the engine in the
            config.
          </p>
          <ul className="mt-4 divide-y divide-[color:var(--border-subtle)]">
            {models.map(([model, count]) => (
              <li key={model}>
                <Link
                  href={`/browse?model=${encodeURIComponent(model)}`}
                  className="flex items-center justify-between gap-4 py-2 transition-colors duration-hover hover:text-primary"
                >
                  <code className="font-mono text-micro text-secondary">{model}</code>
                  <span className="font-mono text-micro tnum text-meta">{num(count)}</span>
                </Link>
              </li>
            ))}
          </ul>

          <h2 className="mt-10 text-heading-s text-primary">Aspect ratios</h2>
          <ul className="mt-4 divide-y divide-[color:var(--border-subtle)]">
            {facets.aspect_ratios.map(([ratio, count]) => (
              <li key={ratio}>
                <Link
                  href={`/browse?ratio=${encodeURIComponent(ratio)}`}
                  className="flex items-center justify-between gap-4 py-2 transition-colors duration-hover hover:text-primary"
                >
                  <code className="font-mono text-micro text-secondary">{ratio}</code>
                  <span className="font-mono text-micro tnum text-meta">{num(count)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 max-w-prose">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-micro text-meta">{n}</span>
        <h2 className="text-heading-s text-primary">{title}</h2>
      </div>
      <div className="mt-3 space-y-3 text-body text-secondary [&_li]:text-small">{children}</div>
    </section>
  );
}
