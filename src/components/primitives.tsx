'use client';

import Link from 'next/link';
import { useState } from 'react';

import { categoryColor, categoryName, tintVars } from '@/lib/categories';
import { outputLabel } from '@/lib/format';
import { categoryLottie, outputLottie } from '@/lib/icon-map';
import { LottieIcon } from './lottie';

/** §6.3 — category badge: tinted pill, mono letter, human name. */
export function CategoryBadge({
  code,
  withName = true,
  href,
  size = 'sm',
}: {
  code: string;
  withName?: boolean;
  href?: string;
  size?: 'sm' | 'md';
}) {
  const pad = size === 'md' ? 'px-2.5 py-1 text-small' : 'px-2 py-0.5 text-micro';
  const inner = (
    <span
      style={tintVars(code)}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-chip ${pad} bg-[var(--c-fill)] text-[var(--c-text)]`}
    >
      <span className="font-mono font-semibold">{code}</span>
      {withName && <span className="font-sans">{categoryName(code)}</span>}
    </span>
  );
  return href ? (
    <Link href={href} className="transition-opacity duration-hover hover:opacity-80">
      {inner}
    </Link>
  ) : (
    inner
  );
}

/**
 * The animated collection glyph in a tinted rounded-square tile — the shape used
 * throughout the redesign wherever a collection needs to be recognised at a glance.
 */
export function CategoryTile({
  code,
  size = 40,
  active,
  className = '',
}: {
  code: string;
  size?: number;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      style={{ ...tintVars(code), width: size, height: size }}
      className={`grid flex-none place-content-center rounded-chip border border-[var(--c-border)] bg-[var(--c-fill)] ${className}`}
    >
      <LottieIcon name={categoryLottie(code)} size={Math.round(size * 0.86)} active={active} />
    </span>
  );
}

/** §6.4 — model chip. These are literal `config.model` strings, so they look like code. */
export function ModelChip({ name }: { name: string }) {
  return (
    <code className="rounded-token bg-inset px-1.5 py-0.5 font-mono text-micro text-secondary">
      {name}
    </code>
  );
}

/**
 * Status pill, in the style of the reference set: tinted fill, matching hairline,
 * coloured label, small leading glyph. One component covers output type, eval state
 * and import readiness so they read as one family.
 */
export function StatusPill({
  tone,
  label,
  glyph,
  className = '',
}: {
  tone: 'video' | 'image' | 'ok' | 'error' | 'neutral' | 'ember';
  label: string;
  glyph?: React.ReactNode;
  className?: string;
}) {
  const color = {
    video: 'var(--signal-video)',
    image: 'var(--signal-image)',
    ok: 'var(--signal-ok)',
    error: 'var(--signal-error)',
    ember: 'var(--ember)',
    neutral: 'var(--text-secondary)',
  }[tone];

  return (
    <span
      style={
        {
          '--c': color,
          '--c-fill': `color-mix(in srgb, ${color} calc(var(--tint-fill) * 100%), transparent)`,
          '--c-border': `color-mix(in srgb, ${color} calc(var(--tint-border) * 100%), transparent)`,
          '--c-text': `color-mix(in srgb, ${color} calc(var(--tint-text) * 100%), var(--text-primary))`,
        } as React.CSSProperties
      }
      className={`inline-flex items-center gap-1.5 rounded-chip border border-[var(--c-border)] bg-[var(--c-fill)] px-2 py-1 text-micro font-medium text-[var(--c-text)] ${className}`}
    >
      {glyph}
      {label}
    </span>
  );
}

export function OutputBadge({ out, animated = false }: { out: string; animated?: boolean }) {
  const isVideo = out.includes('video');
  return (
    <StatusPill
      tone={isVideo ? 'video' : 'image'}
      label={outputLabel(out)}
      glyph={
        animated ? (
          <LottieIcon name={outputLottie(out)} size={15} />
        ) : (
          <Dot color={isVideo ? 'var(--signal-video)' : 'var(--signal-image)'} />
        )
      }
    />
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
  );
}

/** A plain hairline section rule — elevation is borders and tint, not shadows (§4.5). */
export function Rule({ className = '' }: { className?: string }) {
  return <hr className={`border-0 border-t border-edge-subtle ${className}`} />;
}

/** Primary action. Ember is earned by being the one thing to press, not by default. */
export function ButtonLink({
  href,
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  className?: string;
} & Omit<React.ComponentProps<typeof Link>, 'href' | 'children' | 'className'>) {
  const styles = {
    primary: 'bg-ember text-ember-contrast hover:brightness-110 font-semibold shadow-lift',
    secondary: 'bg-surface text-primary border border-edge-subtle hover:border-edge-strong',
    ghost: 'text-secondary hover:text-primary hover:bg-surface',
  }[variant];
  const dims = size === 'lg' ? 'h-12 px-6 text-body' : 'h-10 px-4 text-small';

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-card transition-all duration-hover ${dims} ${styles} ${className}`}
      {...rest}
    >
      {children}
    </Link>
  );
}

/**
 * Tinted feature card, matching the reference set: soft category-coloured fill, animated
 * icon tile, title, and a coloured one-line subtitle. Identical structure in both themes —
 * only the tint alphas change.
 */
export function TintCard({
  code,
  title,
  subtitle,
  href,
  count,
  className = '',
}: {
  code: string;
  title: string;
  subtitle: string;
  href: string;
  count?: string;
  className?: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={tintVars(code)}
      className={`lift group flex items-center gap-3 rounded-bento border border-[var(--c-border)] bg-[var(--c-fill)] p-3 ${className}`}
    >
      <span className="grid h-14 w-14 flex-none place-content-center rounded-card bg-[var(--c-fill)]">
        <LottieIcon name={categoryLottie(code)} size={46} active={hover} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-small font-semibold text-primary">{title}</span>
          {count && (
            <span className="ml-auto flex-none font-mono text-micro tnum text-meta">{count}</span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-small text-[var(--c-text)]">{subtitle}</span>
      </span>
    </Link>
  );
}

export function SectionHeading({
  title,
  action,
  actionHref,
  description,
}: {
  title: string;
  action?: string;
  actionHref?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-heading-m text-primary">{title}</h2>
        {description && (
          <p className="mt-1 max-w-prose text-small text-secondary">{description}</p>
        )}
      </div>
      {action && actionHref && (
        <Link
          href={actionHref}
          className="group inline-flex items-center gap-1.5 text-small text-ember transition-opacity duration-hover hover:opacity-80"
        >
          {action}
          <span
            aria-hidden
            className="transition-transform duration-hover group-hover:translate-x-0.5"
          >
            →
          </span>
        </Link>
      )}
    </div>
  );
}

export { categoryColor };
