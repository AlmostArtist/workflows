'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

import { categoryColor, categoryName, tintVars } from '@/lib/categories';
import { kb, num, outputLabel } from '@/lib/format';
import { categoryLottie } from '@/lib/icon-map';
import type { GraphEncoding, WorkflowRow } from '@/lib/types';
import { DownloadJson } from './download-button';
import { ChevronLeft, ChevronRight } from './icons';
import { ImportButton } from './import-button';
import { LottieIcon } from './lottie';
import { NodeGraph } from './node-graph';

export interface TopTenItem extends WorkflowRow {
  rank: number;
  downloads: number;
  graph?: GraphEncoding | null;
}

/**
 * Top 10, in the streaming-chart idiom: a horizontal rail where each card is preceded by
 * an oversized hollow rank numeral. The numeral is the ranking — no badges, no medals.
 *
 * The rail scrolls by a card width at a time, is keyboard-reachable, and falls back to a
 * plain scroll region when JavaScript is unavailable.
 */
export function TopTen({
  items,
  title,
  caption,
  href,
}: {
  items: TopTenItem[];
  title: string;
  caption: string;
  href: string;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 720), behavior: 'smooth' });
  };

  if (items.length === 0) return null;

  return (
    <section className="py-section">
      <div className="mx-auto max-w-shell px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-heading-m text-primary">{title}</h2>
            <p className="mt-1 text-small text-secondary">{caption}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={href}
              className="group inline-flex items-center gap-1.5 text-small text-ember transition-opacity duration-hover hover:opacity-80"
            >
              See the full ranking
              <span
                aria-hidden
                className="transition-transform duration-hover group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
            <div className="hidden items-center gap-1 md:flex">
              <RailButton dir={-1} onClick={() => scrollBy(-1)} />
              <RailButton dir={1} onClick={() => scrollBy(1)} />
            </div>
          </div>
        </div>
      </div>

      <div
        ref={rail}
        className="rail-scroll mt-7 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:px-6"
      >
        {items.map((item, i) => (
          <article
            key={item.id}
            className="rise snap-start"
            style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
          >
            <div className="flex items-stretch">
              {/* The rank numeral overlaps the card, exactly as the streaming charts do. */}
              <span
                aria-hidden
                className="rank-numeral -mr-7 select-none self-end text-[132px] font-semibold sm:text-[164px]"
              >
                {item.rank}
              </span>

              {/* The card is a link, but its footer actions are real buttons, so they
                  sit as siblings of the anchor rather than nested inside it. */}
              <div
                onMouseEnter={() => setHover(item.id)}
                onMouseLeave={() => setHover(null)}
                style={tintVars(item.cat)}
                className="lift group relative z-10 flex w-[248px] flex-col overflow-hidden rounded-bento border border-edge-subtle bg-surface sm:w-[268px]"
              >
                <Link
                  href={`/workflow/${encodeURIComponent(item.id)}`}
                  className="flex flex-1 flex-col focus-visible:outline-offset-[-2px]"
                >
                  <span className="relative block h-[124px] border-b border-edge-subtle bg-inset">
                    {item.graph ? (
                      <NodeGraph
                        graph={item.graph}
                        cat={item.cat}
                        width={268}
                        height={124}
                        nodeSize={7}
                        padding={14}
                        className="h-full w-full"
                        title={`${item.title} — pipeline diagram`}
                      />
                    ) : (
                      <span className="grid h-full place-content-center text-micro text-meta">
                        {item.nodes} nodes
                      </span>
                    )}
                    <span className="absolute left-2.5 top-2.5">
                      <span
                        className="grid h-11 w-11 place-content-center rounded-chip border border-[var(--c-border)] bg-[var(--c-fill)] backdrop-blur"
                        style={tintVars(item.cat)}
                      >
                        <LottieIcon
                          name={categoryLottie(item.cat)}
                          size={34}
                          active={hover === item.id}
                        />
                      </span>
                    </span>
                  </span>

                  <span className="flex flex-1 flex-col gap-2 p-3.5">
                    <span className="flex items-center gap-2 text-micro">
                      <span
                        className="font-mono font-semibold"
                        style={{ color: categoryColor(item.cat) }}
                      >
                        {item.cat}
                      </span>
                      <span className="truncate text-meta">{categoryName(item.cat)}</span>
                    </span>
                    <span className="line-clamp-2 text-small font-semibold leading-snug text-primary">
                      {item.title}
                    </span>
                    <span className="mt-auto flex items-center gap-2 font-mono text-micro tnum text-meta">
                      <span>{outputLabel(item.out)}</span>
                      <span aria-hidden>·</span>
                      <span>{item.nodes} nodes</span>
                      <span aria-hidden>·</span>
                      <span>{kb(item.kb)}</span>
                    </span>
                  </span>
                </Link>

                <div className="flex items-center justify-between gap-2 border-t border-edge-subtle px-3.5 py-2">
                  <span className="truncate font-mono text-micro tnum text-meta">
                    {item.downloads > 0 ? `${num(item.downloads)} downloads` : 'no downloads yet'}
                  </span>
                  <span className="flex flex-none items-center gap-1.5">
                    <ImportButton id={item.id} title={item.title} variant="icon" />
                    <DownloadJson id={item.id} variant="icon" filename={item.title} />
                  </span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RailButton({ dir, onClick }: { dir: 1 | -1; onClick: () => void }) {
  const Icon = dir === 1 ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 1 ? 'Scroll right' : 'Scroll left'}
      className="grid h-8 w-8 place-content-center rounded-card border border-edge-subtle bg-surface text-secondary transition-colors duration-hover hover:border-edge-strong hover:text-primary"
    >
      <Icon size={16} />
    </button>
  );
}
