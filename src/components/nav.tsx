'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { num } from '@/lib/format';
import { CommandPalette, useCommandPalette } from './command-palette';
import { Search } from './icons';
import { LottieIcon } from './lottie';
import { ThemeToggle } from './theme';

/**
 * §5.1 — sticky 64px nav. The wordmark is caps-locked with `by ShopOS.ai` on a muted
 * sub-line beneath, not inline, so it reads as one product rather than a co-brand pair.
 */
export function Nav({ total }: { total: number }) {
  const pathname = usePathname();
  const { open, setOpen } = useCommandPalette();
  const [mac, setMac] = useState(true);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  const links = [
    { href: '/browse', label: 'Browse' },
    { href: '/categories', label: 'Categories' },
    { href: '/docs/importing', label: 'Docs' },
  ];

  return (
    <>
      <header className="glass sticky top-0 z-40 border-b border-edge-subtle">
        <div className="mx-auto flex h-16 max-w-shell items-center gap-6 px-4 sm:px-6">
          <Link
            href="/"
            className="group flex flex-none items-center gap-2.5 leading-none"
            aria-label="Workflows home"
          >
            <LottieIcon name="ui-aperture" size={38} label="Workflows" />
            <span>
              <span className="block font-semibold tracking-[0.14em] text-[17px] text-primary">
                WORKFLOWS
              </span>
              <span className="mt-0.5 block text-[10px] tracking-[0.1em] text-meta">
                by ShopOS.ai
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + '/');
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-chip px-3 py-1.5 text-small transition-colors duration-hover ${
                    active
                      ? 'bg-surface-2 text-primary'
                      : 'text-secondary hover:bg-surface hover:text-primary'
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden font-mono text-micro tnum text-meta lg:block">
              {num(total)} files
            </span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-9 items-center gap-2 rounded-card border border-edge-subtle bg-inset pl-3 pr-2 text-small text-meta transition-colors duration-hover hover:border-edge-strong hover:text-secondary"
              aria-label="Search workflows"
            >
              <Search size={15} />
              <span className="hidden sm:inline">Search</span>
              <kbd className="ml-1 hidden rounded-token border border-edge-subtle px-1.5 py-0.5 font-mono text-[11px] sm:inline">
                {mac ? '⌘K' : 'Ctrl K'}
              </kbd>
            </button>
            <ThemeToggle />
          </div>
        </div>
        {/* Below `sm` the inline links do not fit beside the wordmark, so they move to
            their own 44px-tall strip rather than disappearing behind a menu button. */}
        <nav
          className="flex h-11 items-center gap-1 border-t border-edge-subtle px-4 sm:hidden"
          aria-label="Main"
        >
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + '/');
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-9 items-center rounded-chip px-3 text-small transition-colors duration-hover ${
                  active ? 'bg-surface-2 text-primary' : 'text-secondary'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <span className="ml-auto font-mono text-micro tnum text-meta">
            {num(total)} files
          </span>
        </nav>
      </header>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </>
  );
}
