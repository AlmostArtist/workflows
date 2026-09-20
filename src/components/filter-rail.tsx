'use client';

import { categoryColor, categoryName } from '@/lib/categories';
import { num } from '@/lib/format';
import { NODE_BUCKET_LABELS } from '@/lib/facet-labels';
import type { FacetBucket, NodeBucket, OutputType, Query, SearchResponse } from '@/lib/types';
import { toggle } from '@/lib/url-state';

/**
 * §5.2 filter rail. Counts come from the server and are recomputed for every dimension
 * with that dimension's own selection excluded, so a checkbox always states how many
 * results it would add rather than a frozen catalogue total (§7.2).
 */

interface RailProps {
  query: Query;
  facets: SearchResponse['facets'] | null;
  onChange: (patch: Partial<Query>) => void;
  onClear: () => void;
  activeCount: number;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-edge-subtle py-4 first:border-t-0 first:pt-0">
      <h3 className="mb-2 text-micro font-semibold uppercase tracking-[0.08em] text-meta">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** §6.5 — the whole row fills with ember-wash when checked, not just the control. */
function FacetRow({
  type,
  name,
  checked,
  disabled,
  onChange,
  label,
  count,
  swatch,
  mono,
}: {
  type: 'checkbox' | 'radio';
  name?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: React.ReactNode;
  count?: number;
  swatch?: string;
  mono?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-chip px-2 py-1.5 transition-colors duration-hover ${
        checked ? 'bg-ember-wash' : 'hover:bg-surface-2'
      } ${disabled && !checked ? 'opacity-45' : ''}`}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled && !checked}
      />
      {swatch && (
        <span
          aria-hidden
          className="h-2.5 w-2.5 flex-none rounded-[3px]"
          style={{ background: swatch }}
        />
      )}
      <span
        className={`min-w-0 flex-1 truncate text-small ${
          checked ? 'text-primary' : 'text-secondary'
        } ${mono ? 'font-mono text-micro' : ''}`}
      >
        {label}
      </span>
      {count !== undefined && (
        <span className="flex-none font-mono text-micro tnum text-meta">{num(count)}</span>
      )}
    </label>
  );
}

function countOf(list: FacetBucket[] | undefined, value: string): number {
  return list?.find((b) => b.value === value)?.count ?? 0;
}

export function FilterRail({ query, facets, onChange, onClear, activeCount }: RailProps) {
  const catBuckets = facets?.categories ?? [];
  const outBuckets = facets?.outputs ?? [];
  const modelBuckets = facets?.models ?? [];
  const ratioBuckets = facets?.ratios ?? [];
  const nodeBuckets = facets?.nodeBuckets ?? [];

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-micro font-semibold uppercase tracking-[0.1em] text-secondary">
          Filters
        </h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-small text-ember transition-opacity duration-hover hover:opacity-80"
          >
            Clear all
          </button>
        )}
      </div>

      <Section title="Category">
        <div className="-mx-2 max-h-[340px] overflow-y-auto pr-1">
          {catBuckets.map((b) => (
            <FacetRow
              key={b.value}
              type="checkbox"
              checked={query.categories.includes(b.value)}
              disabled={b.count === 0}
              onChange={() => onChange({ categories: toggle(query.categories, b.value), page: 1 })}
              swatch={categoryColor(b.value)}
              label={
                <>
                  <span className="font-mono font-semibold">{b.value}</span>{' '}
                  <span>{categoryName(b.value)}</span>
                </>
              }
              count={b.count}
            />
          ))}
        </div>
      </Section>

      <Section title="Output type">
        <div className="-mx-2">
          {(['image', 'video', 'image+video'] as OutputType[]).map((o) => (
            <FacetRow
              key={o}
              type="checkbox"
              checked={query.outputs.includes(o)}
              disabled={countOf(outBuckets, o) === 0}
              onChange={() => onChange({ outputs: toggle(query.outputs, o) as OutputType[], page: 1 })}
              label={o === 'image+video' ? 'image + video' : o}
              count={countOf(outBuckets, o)}
            />
          ))}
        </div>
      </Section>

      <Section title="Model used">
        <div className="-mx-2">
          {modelBuckets.map((b) => (
            <FacetRow
              key={b.value}
              type="checkbox"
              checked={query.models.includes(b.value)}
              disabled={b.count === 0}
              onChange={() => onChange({ models: toggle(query.models, b.value), page: 1 })}
              label={b.value}
              count={b.count}
              mono
            />
          ))}
        </div>
        {query.models.length > 1 && (
          <p className="mt-1 px-2 text-micro text-meta">
            Multiple models match workflows that use all of them.
          </p>
        )}
      </Section>

      <Section title="Node count">
        <div className="-mx-2">
          {(['any', 'lt10', '10-15', 'gt15'] as NodeBucket[]).map((b) => (
            <FacetRow
              key={b}
              type="radio"
              name="nodeBucket"
              checked={query.nodeBucket === b}
              disabled={countOf(nodeBuckets, b) === 0}
              onChange={() => onChange({ nodeBucket: b, page: 1 })}
              label={NODE_BUCKET_LABELS[b]}
              count={countOf(nodeBuckets, b)}
            />
          ))}
        </div>
      </Section>

      <Section title="Aspect ratio">
        <div className="flex flex-wrap gap-1.5">
          {ratioBuckets.map((b) => {
            const on = query.ratios.includes(b.value);
            const off = b.count === 0 && !on;
            return (
              <button
                key={b.value}
                type="button"
                disabled={off}
                aria-pressed={on}
                onClick={() => onChange({ ratios: toggle(query.ratios, b.value), page: 1 })}
                className={`rounded-chip border px-2 py-1 font-mono text-micro transition-colors duration-hover ${
                  on
                    ? 'border-ember bg-ember-wash text-ember'
                    : 'border-edge-subtle text-secondary hover:border-edge-strong'
                } ${off ? 'opacity-40' : ''}`}
              >
                {b.value}
                <span className="ml-1.5 tnum text-meta">{num(b.count)}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Import readiness">
        <div className="-mx-2">
          <FacetRow
            type="checkbox"
            checked={query.needsInput}
            onChange={() => onChange({ needsInput: !query.needsInput, page: 1 })}
            label="Needs an input URL"
          />
        </div>
        <p className="mt-1 px-2 text-micro text-meta">
          Workflows with a blank input node you must fill before the first run.
        </p>
      </Section>
    </div>
  );
}
