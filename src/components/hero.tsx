'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { categoryColor, categoryName, tintVars } from '@/lib/categories';
import { num, outputLabel } from '@/lib/format';
import { categoryLottie } from '@/lib/icon-map';
import type { SuggestResponse } from '@/lib/types';
import { LottieIcon } from './lottie';
import { Odometer } from './odometer';

/**
 * Landing hero.
 *
 * A full-bleed motion background with a frosted search panel floating at its centre.
 * The search is live: it queries the catalogue as you type and drops results straight
 * under the field, so the first thing the page does is answer a question rather than
 * describe itself.
 *
 * The background prefers a real video (`/hero.mp4`, supplied by the site owner) and
 * falls back to a generated canvas that animates the product's own subject matter —
 * node graphs assembling and flowing left to right. The fallback is the default, so
 * the page ships complete with no asset to source.
 */
export function Hero({
  total,
  collections,
  nodeKinds,
  hasVideo,
}: {
  total: number;
  collections: number;
  nodeKinds: number;
  hasVideo: boolean;
}) {
  return (
    <section className="relative isolate">
      <HeroBackdrop hasVideo={hasVideo} />

      <div className="relative z-10 mx-auto flex min-h-[520px] max-w-shell flex-col items-center justify-center px-4 py-16 text-center sm:min-h-[640px] sm:px-6 sm:py-24 lg:min-h-[720px]">
        <span className="rise inline-flex items-center gap-2 rounded-chip border border-[var(--hero-border)] bg-[var(--hero-panel)] px-3 py-1.5 text-micro text-[var(--hero-muted)] backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ember" />
          </span>
          {num(total)} workflows indexed · 0 import errors
        </span>

        <h1
          className="rise mt-6 max-w-hero text-display-l text-[var(--hero-ink)] sm:text-display-xl"
          style={{ animationDelay: '60ms', textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}
        >
          Every workflow you need,
          <br />
          <span className="text-ember">already built.</span>
        </h1>

        <p
          className="rise mt-5 max-w-[56ch] text-body text-[var(--hero-muted)]"
          style={{ animationDelay: '120ms' }}
        >
          A searchable foundry of importable{' '}
          <code className="rounded-token bg-[var(--hero-code)] px-1.5 py-0.5 font-mono text-micro text-[var(--hero-ink)] backdrop-blur">
            vibe-workflow-export
          </code>{' '}
          node graphs. Find one, inspect the pipeline, download the JSON.
        </p>

        <div className="rise mt-9 w-full max-w-2xl" style={{ animationDelay: '180ms' }}>
          <LiveSearch total={total} />
        </div>

        <dl
          className="rise mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-5"
          style={{ animationDelay: '240ms' }}
        >
          {[
            { v: total, k: 'workflows' },
            { v: collections, k: 'collections' },
            { v: nodeKinds, k: 'node kinds' },
            { v: 0, k: 'import errors', ok: true },
          ].map((s) => (
            <div key={s.k} className="text-center">
              <dt className="sr-only">{s.k}</dt>
              <dd
                className={`font-mono text-heading-m ${s.ok ? 'text-signal-ok' : 'text-[var(--hero-ink)]'}`}
              >
                <Odometer value={s.v} duration={1400} />
              </dd>
              <dd className="mt-0.5 text-small text-[var(--hero-faint)]">{s.k}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------- */

function HeroBackdrop({ hasVideo }: { hasVideo: boolean }) {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {hasVideo ? (
        <HeroVideo />
      ) : (
        <GraphCanvas />
      )}

      {/* Scrim keeps hero text at full contrast over the video / canvas. */}
      <div className="hero-scrim absolute inset-0" />
    </div>
  );
}

/** Keeps the muted background video moving when a browser defers declarative autoplay. */
function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const start = () => {
      video.muted = true;
      void video.play().catch(() => {
        // A browser can still require an interaction under a strict autoplay policy.
      });
    };
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) start();
    else video.addEventListener('canplay', start, { once: true });
    return () => video.removeEventListener('canplay', start);
  }, []);

  return (
    <video
      ref={ref}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className="hero-media h-full w-full object-cover"
    >
      <source src="/Video-wallback.mp4" type="video/mp4" />
    </video>
  );
}

/**
 * Generated motion background: nodes drifting along pipeline lanes, edges drawn between
 * successive stages. Deterministic per load, cheap (one canvas, ~120 nodes), and paused
 * entirely under reduced motion or when the tab is hidden.
 */
function GraphCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let w = 0;
    let h = 0;

    const LANES = 7;
    type Node = { x: number; y: number; lane: number; v: number; r: number; hue: number };
    let nodes: Node[] = [];

    const css = getComputedStyle(document.documentElement);
    const ember = css.getPropertyValue('--ember').trim() || '#ff7a1a';
    const line = css.getPropertyValue('--border-strong').trim() || '#34383e';

    const seed = (() => {
      let s = 20260920;
      return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
    })();

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      nodes = [];
      for (let lane = 0; lane < LANES; lane++) {
        const count = 14 + Math.floor(seed() * 6);
        for (let i = 0; i < count; i++) {
          nodes.push({
            lane,
            x: seed() * w,
            y: ((lane + 0.5) / LANES) * h + (seed() - 0.5) * (h / LANES) * 0.5,
            v: 0.12 + seed() * 0.3,
            r: 1.6 + seed() * 2.6,
            hue: seed(),
          });
        }
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);

      // Edges first, between neighbours in the same lane, so the field reads as pipelines.
      ctx!.lineWidth = 1;
      for (let lane = 0; lane < LANES; lane++) {
        const inLane = nodes.filter((n) => n.lane === lane).sort((a, b) => a.x - b.x);
        for (let i = 1; i < inLane.length; i++) {
          const a = inLane[i - 1];
          const b = inLane[i];
          const gap = b.x - a.x;
          if (gap > 180) continue;
          ctx!.globalAlpha = Math.max(0, 0.32 * (1 - gap / 180));
          ctx!.strokeStyle = line;
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.bezierCurveTo(a.x + gap * 0.45, a.y, b.x - gap * 0.45, b.y, b.x, b.y);
          ctx!.stroke();
        }
      }

      for (const n of nodes) {
        // A tenth of the nodes are generation stages and carry the accent.
        const accent = n.hue > 0.88;
        ctx!.globalAlpha = accent ? 0.85 : 0.4;
        ctx!.fillStyle = accent ? ember : line;
        ctx!.beginPath();
        ctx!.roundRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2, n.r * 0.5);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function tick() {
      for (const n of nodes) {
        n.x += n.v;
        if (n.x - n.r > w) n.x = -n.r * 2;
      }
      draw();
      raf = requestAnimationFrame(tick);
    }

    resize();
    draw();
    if (!reduced) raf = requestAnimationFrame(tick);

    const onResize = () => {
      resize();
      draw();
    };
    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduced) raf = requestAnimationFrame(tick);
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="h-full w-full" />;
}

/* --------------------------------------------------------------------------- */

/** Transparent hero search that resolves results inline as you type. */
function LiveSearch({ total }: { total: number }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [data, setData] = useState<SuggestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const term = q.trim();
  const open = focused && term.length >= 2;
  const flat = (data?.groups ?? []).flatMap((g) => g.items);

  useEffect(() => {
    if (term.length < 2) {
      setData(null);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j: SuggestResponse) => {
          setData(j);
          setActive(0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 120);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);

  // Closing on outside click keeps the panel from covering the stats row.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const submit = useCallback(() => {
    router.push(term ? `/browse?q=${encodeURIComponent(term)}` : '/browse');
  }, [router, term]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setFocused(false);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a >= flat.length ? 0 : a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? flat.length : a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active < flat.length && flat[active]) {
        router.push(`/workflow/${encodeURIComponent(flat[active].id)}`);
      } else submit();
    }
  };

  let idx = -1;

  return (
    <div ref={box} className="relative z-20">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={`hero-search-panel flex items-center gap-3 rounded-panel border px-4 backdrop-blur-xl transition-all duration-200 ${
          open ? 'rounded-b-none' : ''
        } ${focused ? 'shadow-float' : ''}`}
      >
        <LottieIcon name="ui-aperture" size={40} mode={focused ? 'loop' : 'hover'} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          placeholder={`Search ${num(total)} workflows — try "skincare", "reshoot", "seedance"`}
          aria-label="Search workflows"
          aria-expanded={open}
          aria-controls="hero-search-results"
          className="h-16 min-w-0 w-full bg-transparent text-body text-[var(--hero-ink)] outline-none placeholder:text-[var(--hero-faint)]"
        />
        <button
          type="submit"
          className="inline-flex h-10 flex-none items-center rounded-card bg-ember px-3 text-small font-semibold text-ember-contrast transition-all duration-hover hover:brightness-110 sm:px-5"
        >
          Search
        </button>
      </form>

      {open && (
        <div
          id="hero-search-results"
          className="hero-search-results relative z-30 max-h-[min(22rem,calc(100dvh-20rem))] overflow-y-auto overscroll-contain rounded-b-panel border border-t-0 text-left shadow-float backdrop-blur-xl"
        >
          {loading && !data && (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="shimmer h-10 rounded-card" />
              ))}
            </div>
          )}

          {data && data.total === 0 && (
            <p className="px-5 py-6 text-small text-[var(--hero-muted)]">
              Nothing matches "{term}". Titles and tags come from the catalogue filenames —
              try a broader word.
            </p>
          )}

          {data?.groups.map((g) => (
            <div key={g.cat}>
              <div className="flex items-center gap-2 px-5 pb-1 pt-3">
                <span
                  className="font-mono text-micro font-semibold"
                  style={{ color: categoryColor(g.cat) }}
                >
                  {g.cat}
                </span>
                <span className="text-micro text-[var(--hero-faint)]">{categoryName(g.cat)}</span>
              </div>
              {g.items.map((it) => {
                idx += 1;
                const i = idx;
                return (
                  <button
                    key={it.id}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => router.push(`/workflow/${encodeURIComponent(it.id)}`)}
                    className={`flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors duration-hover ${
                      i === active ? 'bg-[var(--hero-code)]' : ''
                    }`}
                  >
                    <span
                      style={tintVars(it.cat)}
                      className="grid h-10 w-10 flex-none place-content-center rounded-chip bg-[var(--c-fill)]"
                    >
                      <LottieIcon name={categoryLottie(it.cat)} size={30} mode="static" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-small text-[var(--hero-ink)]">
                      {it.title}
                    </span>
                    <span className="flex-none font-mono text-micro text-[var(--hero-faint)]">
                      {outputLabel(it.out)}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}

          {data && data.total > 0 && (
            <button
              type="button"
              onMouseEnter={() => setActive(flat.length)}
              onClick={submit}
              className={`flex w-full items-center justify-between border-t border-[var(--hero-border)] px-5 py-3.5 text-left transition-colors duration-hover ${
                active === flat.length ? 'bg-[var(--hero-code)]' : ''
              }`}
            >
              <span className="text-small text-ember">
                See all {num(data.total)} results for “{term}”
              </span>
              <span aria-hidden className="text-small text-ember">
                →
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
