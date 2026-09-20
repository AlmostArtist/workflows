'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { num, plural } from '@/lib/format';
import type {
  GraphEncoding,
  Query,
  SearchResponse,
  SortKey,
  ViewMode,
} from '@/lib/types';
import {
  activeFilterCount,
  DEFAULT_QUERY,
  parseQuery,
  serializeQuery,
  SORT_LABELS,
} from '@/lib/url-state';
import { FilterRail } from './filter-rail';
import { ChevronLeft, ChevronRight, Close, Filter, GridView, ListView, Search } from './icons';
import { WorkflowGridTile, WorkflowListRow } from './workflow-card';

const ROW_HEIGHT = 72; // 64px card + 8px gap
const ROW_HEIGHT_SM = 92; // 84px card + 8px gap — taller rows below `sm` (§8)
const TILE_HEIGHT = 228;

/**
 * The browse screen (§5.2). All filter state lives in the URL; the result set is fetched
 * from /api/search and rendered through a windowing virtualizer, so the DOM holds only
 * the visible rows however large the filtered set is (§7.3).
 */
export function BrowseClient({
  initial,
  lockedCategory,
  heading,
}: {
  initial: SearchResponse;
  /** Set on a category landing page — the rail's category section stays fixed. */
  lockedCategory?: string;
  heading?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const query = useMemo(() => {
    const q = parseQuery(new URLSearchParams(params.toString()));
    if (lockedCategory) q.categories = [lockedCategory];
    return q;
  }, [params, lockedCategory]);

  const view = (params.get('view') as ViewMode) === 'grid' ? 'grid' : 'list';

  const [data, setData] = useState<SearchResponse>(initial);
  const [pending, setPending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftQ, setDraftQ] = useState(query.q);
  const [fading, setFading] = useState(false);

  const firstRender = useRef(true);
  // Held in state rather than a ref: attaching a ref does not re-render, so the
  // virtualizer would measure a null scroll element once and render zero rows.
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const queryKey = useMemo(() => serializeQuery(query, view), [query, view]);

  // --- URL is the source of truth ------------------------------------------
  const push = useCallback(
    (patch: Partial<Query>, nextView?: ViewMode) => {
      const next: Query = { ...query, ...patch };
      if (lockedCategory) next.categories = [lockedCategory];
      const qs = serializeQuery(next, nextView ?? view);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [query, view, router, pathname, lockedCategory],
  );

  // --- fetch on every URL change -------------------------------------------
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const ctrl = new AbortController();
    setPending(true);
    const qs = serializeQuery(query);
    let current = true;
    fetch(`/api/search?${qs}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j: SearchResponse) => {
        if (!current) return;
        // §4.7 — results cross-fade rather than reflowing under the cursor.
        setFading(true);
        setData(j);
        window.setTimeout(() => setFading(false), 150);
      })
      .catch((e) => {
        if (current && e.name !== 'AbortError') setPending(false);
      })
      .finally(() => {
        if (current) setPending(false);
      });
    return () => {
      current = false;
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => setDraftQ(query.q), [query.q]);

  // A filter drawer is a true modal on compact layouts: do not let the page behind it
  // scroll, and always offer Escape as a predictable way out.
  useEffect(() => {
    if (!sheetOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSheetOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [sheetOpen]);

  // Reset scroll whenever the result set changes, including filters that stay on page one.
  useEffect(() => {
    scrollEl?.scrollTo({ top: 0 });
  }, [queryKey, scrollEl]);

  // --- virtualization -------------------------------------------------------
  const perRow = useGridColumns(view, scrollEl);
  const rowHeight = useRowHeight();
  const itemCount = view === 'list' ? data.rows.length : Math.ceil(data.rows.length / perRow);

  const virtualizer = useVirtualizer({
    count: itemCount,
    getScrollElement: () => scrollEl,
    estimateSize: () => (view === 'list' ? rowHeight : TILE_HEIGHT),
    overscan: 8,
  });

  // Grid view needs the graph encodings, which the list payload deliberately omits.
  const graphs = useGraphs(view === 'grid' ? data.rows.map((r) => r.id) : []);

  const activeCount = activeFilterCount(query) - (lockedCategory ? 1 : 0);

  const railProps = {
    query,
    facets: data.facets,
    onChange: (patch: Partial<Query>) => push(patch),
    onClear: () => {
      const cleared: Query = { ...DEFAULT_QUERY, q: query.q, sort: query.sort };
      if (lockedCategory) cleared.categories = [lockedCategory];
      const qs = serializeQuery(cleared, view);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      setSheetOpen(false);
    },
    activeCount,
  };

  const items = virtualizer.getVirtualItems();

  return (
    <div className="mx-auto flex w-full max-w-shell gap-8 overflow-x-clip px-4 py-8 sm:px-6">
      {/* The permanent rail starts only when it leaves enough width for full result rows. */}
      <aside className="hidden w-rail flex-none xl:block">
        <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
          <FilterRail {...railProps} />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-display-l text-primary">{heading ?? 'Browse workflows'}</h1>
          <div className="flex items-center gap-2">
            <ViewToggle view={view} onChange={(v) => push({}, v)} />
          </div>
        </div>

        {/* --- search + sort --- */}
        <form
          className="mt-5 flex min-w-0 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            push({ q: draftQ, page: 1 });
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tertiary"
            />
            <input
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              placeholder={`Search within ${num(data.grandTotal)} workflows…`}
              aria-label="Search within results"
              className="h-11 w-full rounded-card border border-edge-subtle bg-inset pl-9 pr-9 text-small text-primary outline-none transition-colors duration-hover focus:border-ember"
            />
            {draftQ && (
              <button
                type="button"
                onClick={() => {
                  setDraftQ('');
                  push({ q: '', page: 1 });
                }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-chip p-1 text-meta hover:text-primary"
              >
                <Close size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex h-11 flex-none items-center gap-2 rounded-card border border-edge-subtle bg-surface px-3 text-small text-secondary transition-colors duration-hover hover:border-edge-strong hover:text-primary xl:hidden"
          >
            <Filter size={15} />
            Filters
            {activeCount > 0 && (
              <span className="rounded-full bg-ember px-1.5 font-mono text-[11px] text-canvas">
                {activeCount}
              </span>
            )}
          </button>
        </form>

        {/* --- count + sort --- */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-small text-secondary" aria-live="polite">
            <span className={`font-mono tnum ${pending ? 'text-meta' : 'text-primary'}`}>
              {num(data.total)}
            </span>{' '}
            of <span className="font-mono tnum">{num(data.grandTotal)}</span>{' '}
            {plural(data.total, 'workflow')}
          </p>
          <span aria-hidden className="text-tertiary">
            ·
          </span>
          <SortSelect value={query.sort} onChange={(s) => push({ sort: s, page: 1 })} />
          <span className="ml-auto font-mono text-micro tnum text-meta">
            {data.took} ms
          </span>
        </div>

        {/* --- results --- */}
        {data.total === 0 ? (
          <EmptyState
            data={data}
            query={query}
            onAction={railProps.onChange}
            onClear={railProps.onClear}
          />
        ) : (
          <>
            <div
              ref={setScrollEl}
              aria-busy={pending}
              className={`mt-4 max-h-[calc(100dvh-18rem)] min-h-[280px] overflow-y-auto overscroll-contain rounded-panel transition-opacity duration-fade sm:min-h-[420px] ${
                fading ? 'opacity-40' : 'opacity-100'
              }`}
            >
              <div
                style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}
              >
                {items.map((v) => {
                  const style: React.CSSProperties = {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${v.start}px)`,
                  };
                  if (view === 'list') {
                    const row = data.rows[v.index];
                    return row ? (
                      <WorkflowListRow key={row.id} row={row} style={style} />
                    ) : null;
                  }
                  const slice = data.rows.slice(v.index * perRow, v.index * perRow + perRow);
                  return (
                    <div
                      key={v.key}
                      // Column count is measured rather than set by a breakpoint class, so
                      // the virtualizer's row maths and the track template cannot disagree.
                      style={{
                        ...style,
                        display: 'grid',
                        gap: '8px',
                        gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))`,
                      }}
                    >
                      {slice.map((row) => (
                        <WorkflowGridTile
                          key={row.id}
                          row={row}
                          graph={graphs[row.id] ?? null}
                          style={{ height: TILE_HEIGHT - 8 }}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            <Pagination
              page={data.page}
              pages={data.pages}
              onPage={(p) => push({ page: p })}
            />
          </>
        )}
      </div>

      {/* --- mobile / tablet filter sheet (§8) --- */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end xl:hidden"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSheetOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/60" aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="relative max-h-[82vh] w-full animate-sheet-up overflow-y-auto rounded-t-card border-t border-edge-strong bg-surface p-4 shadow-float sm:h-full sm:max-h-none sm:w-80 sm:animate-fade-in sm:rounded-none sm:border-l sm:border-t-0"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-heading-s text-primary">Filters</span>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close filters"
                className="rounded-chip p-1.5 text-secondary hover:bg-surface-2 hover:text-primary"
              >
                <Close size={18} />
              </button>
            </div>
            <FilterRail {...railProps} />
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-5 h-11 w-full rounded-card bg-ember text-small font-semibold text-canvas"
            >
              Show {num(data.total)} {plural(data.total, 'workflow')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- sub-components ----------------------------------------------------------

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div
      role="group"
      aria-label="View mode"
      className="flex rounded-card border border-edge-subtle bg-surface p-0.5"
    >
      {(
        [
          { key: 'list' as const, Icon: ListView, label: 'List' },
          { key: 'grid' as const, Icon: GridView, label: 'Grid' },
        ]
      ).map(({ key, Icon, label }) => (
        <button
          key={key}
          type="button"
          aria-pressed={view === key}
          onClick={() => onChange(key)}
          title={`${label} view`}
          className={`flex h-8 w-9 items-center justify-center rounded-[7px] transition-colors duration-hover ${
            view === key ? 'bg-surface-2 text-primary' : 'text-meta hover:text-primary'
          }`}
        >
          <Icon size={16} />
          <span className="sr-only">{label} view</span>
        </button>
      ))}
    </div>
  );
}

function SortSelect({ value, onChange }: { value: SortKey; onChange: (s: SortKey) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-small text-secondary">
      <span>sorted by</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="cursor-pointer rounded-chip border border-edge-subtle bg-surface px-2 py-1 text-small text-primary outline-none transition-colors duration-hover hover:border-edge-strong"
      >
        {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
          <option key={k} value={k}>
            {SORT_LABELS[k]}
          </option>
        ))}
      </select>
    </label>
  );
}

function Pagination({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (p: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-between" aria-label="Pagination">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="flex h-9 items-center gap-1.5 rounded-card border border-edge-subtle px-3 text-small text-secondary transition-colors duration-hover hover:border-edge-strong hover:text-primary disabled:opacity-35 disabled:hover:border-edge-subtle"
      >
        <ChevronLeft size={15} />
        Previous
      </button>
      <span className="font-mono text-small tnum text-secondary">
        Page {num(page)} of {num(pages)}
      </span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        className="flex h-9 items-center gap-1.5 rounded-card border border-edge-subtle px-3 text-small text-secondary transition-colors duration-hover hover:border-edge-strong hover:text-primary disabled:opacity-35 disabled:hover:border-edge-subtle"
      >
        Next
        <ChevronRight size={15} />
      </button>
    </nav>
  );
}

/** §5.6 — teach the filter system instead of shrugging. */
function EmptyState({
  data,
  query,
  onAction,
  onClear,
}: {
  data: SearchResponse;
  query: Query;
  onAction: (patch: Partial<Query>) => void;
  onClear: () => void;
}) {
  const hint = data.hint;
  return (
    <div className="mt-6 rounded-panel border border-edge-subtle bg-surface p-8">
      <h2 className="text-heading-m text-primary">No workflows match this combination</h2>
      <p className="mt-3 max-w-prose text-body text-secondary">
        {hint?.message ??
          'This filter combination returns 0 results. Clear a filter to widen the set.'}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {hint?.action && (
          <button
            type="button"
            onClick={() => {
              const { drop, value } = hint.action!;
              if (drop === 'nodeBucket') onAction({ nodeBucket: 'any', page: 1 });
              else if (drop === 'needsInput') onAction({ needsInput: false, page: 1 });
              else if (value) {
                // A named conflicting value: drop just that one, keep the rest of the
                // dimension's selection intact.
                const current = (query[drop] as string[]) ?? [];
                onAction({ [drop]: current.filter((v) => v !== value), page: 1 } as Partial<Query>);
              } else onAction({ [drop]: [], page: 1 } as Partial<Query>);
            }}
            className="h-10 rounded-card bg-ember px-4 text-small font-semibold text-canvas transition-colors duration-hover hover:bg-[#ff8c3a]"
          >
            {hint.action.label}
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          className="h-10 rounded-card border border-edge-subtle px-4 text-small text-secondary transition-colors duration-hover hover:border-edge-strong hover:text-primary"
        >
          Clear all filters
        </button>
      </div>
    </div>
  );
}

// --- hooks -------------------------------------------------------------------

/** List rows grow below `sm` so the title can wrap to two lines; keep the two in step. */
function useRowHeight(): number {
  const [h, setH] = useState(ROW_HEIGHT);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const apply = () => setH(mq.matches ? ROW_HEIGHT : ROW_HEIGHT_SM);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return h;
}

/** Measures how many grid columns fit, so the virtualizer's row maths stays honest. */
function useGridColumns(view: ViewMode, container: HTMLDivElement | null): number {
  const [cols, setCols] = useState(1);
  useEffect(() => {
    if (view !== 'grid' || !container) return;
    const measure = () => {
      // The filter rail changes the result area's real width, so viewport breakpoints
      // produce orphaned columns. Measure the grid's own container instead.
      const next = Math.min(4, Math.max(1, Math.floor((container.clientWidth + 8) / 268)));
      setCols(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [view, container]);
  return view === 'grid' ? cols : 1;
}

/** Fetches graph encodings for the current page of grid tiles, once per page. */
function useGraphs(ids: string[]): Record<string, GraphEncoding> {
  const [graphs, setGraphs] = useState<Record<string, GraphEncoding>>({});
  const key = ids.join(',');

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    fetch(`/api/graphs?ids=${encodeURIComponent(key)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j: Record<string, GraphEncoding>) => setGraphs((prev) => ({ ...prev, ...j })))
      .catch(() => {});
    return () => ctrl.abort();
  }, [key]);

  return graphs;
}
