'use client';

import { useState } from 'react';

import { STEP_LOTTIE } from '@/lib/icon-map';
import { LottieIcon } from './lottie';

/**
 * How it works, as four stepped cards with a tabbed header strip — the shape of the
 * reference layout, but carrying real product detail rather than placeholder copy.
 */
const STEPS = [
  {
    n: 'Step 1',
    title: 'Search',
    tint: 'var(--signal-video)',
    body: 'Filter by collection, output type, model, node count or aspect ratio. Every count updates against the live result set, so you always know what a filter costs.',
    note: 'sub-10ms across 52,160',
  },
  {
    n: 'Step 2',
    title: 'Inspect',
    tint: 'var(--ember)',
    body: 'Each workflow page draws its real node graph, lists the exact models it calls and names every input node left deliberately blank.',
    note: 'the pipeline is the preview',
  },
  {
    n: 'Step 3',
    title: 'Download',
    tint: 'var(--signal-ok)',
    body: 'One button hands you the original .json, byte-for-byte from the library. Nothing is repackaged on the way out.',
    note: 'verified identical to source',
  },
  {
    n: 'Step 4',
    title: 'Import & run',
    tint: 'var(--signal-image)',
    body: 'Import the graph, paste your own asset URLs into the nodes it flagged, then run. Raise resolution in the UI if your account allows it.',
    note: '0 import errors on record',
  },
] as const;

export function StepsRow() {
  return (
    <section className="mx-auto max-w-shell px-4 py-section sm:px-6">
      <div className="max-w-prose">
        <h2 className="text-heading-m text-primary">From search to running graph</h2>
        <p className="mt-2 text-small text-secondary">
          Four steps, no blank canvas at any point.
        </p>
      </div>

      <ol className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((s, i) => (
          <StepCard key={s.title} step={s} index={i} icon={STEP_LOTTIE[i % STEP_LOTTIE.length]} />
        ))}
      </ol>
    </section>
  );
}

function StepCard({
  step,
  index,
  icon,
}: {
  step: (typeof STEPS)[number];
  index: number;
  icon: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <li
      className="rise"
      style={{ animationDelay: `${index * 70}ms` }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        style={
          {
            '--c': step.tint,
            '--c-fill': `color-mix(in srgb, ${step.tint} calc(var(--tint-fill) * 100%), transparent)`,
            '--c-border': `color-mix(in srgb, ${step.tint} calc(var(--tint-border) * 100%), transparent)`,
            '--c-text': `color-mix(in srgb, ${step.tint} calc(var(--tint-text) * 100%), var(--text-primary))`,
          } as React.CSSProperties
        }
        className="lift flex h-full flex-col rounded-bento border border-edge-subtle bg-surface"
      >
        <div className="flex items-center justify-between px-4 pt-3.5">
          <span className="font-mono text-micro text-meta">{step.n}</span>
          <LottieIcon name={icon} size={52} active={hover} />
        </div>

        {/* Tinted plate, echoing the folder-tab shape of the reference cards. */}
        <div className="mt-3 flex flex-1 flex-col rounded-b-bento border-t border-[var(--c-border)] bg-[var(--c-fill)] p-4">
          <h3 className="text-heading-s text-[var(--c-text)]">{step.title}</h3>
          <p className="mt-2 text-small leading-relaxed text-secondary">{step.body}</p>
          <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-chip border border-[var(--c-border)] px-2 py-1 font-mono text-micro text-[var(--c-text)]">
            {step.note}
          </span>
        </div>
      </div>
    </li>
  );
}
