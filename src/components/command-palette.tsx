'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { categoryColor, categoryName } from '@/lib/categories';
import { num, outputLabel } from '@/lib/format';
import type { SuggestResponse } from '@/lib/types';
import { Search } from './icons';

/**
 * §6.7 — the ⌘K overlay. Available from every page, not just /browse. Typeahead shows
 * the top matches grouped by category, with a "see all N results" row that hands the
 * query straight to /browse so the filter rail picks up from there.
 */
export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [data, setData] = useState<SuggestResponse | null>(null);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten the grouped results so arrow keys walk a single list.
  const flat = useMemo(() => {
    const items = (data?.groups ?? []).flatMap((g) => g.items);
    return items;
  }, [data]);

  useEffect(() => {
    if (open) {
      setActive(0);
      // Focus after paint so the dialog is mounted and the caret lands correctly.
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQ('');
      setData(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setData(null);
      setLoading(false);
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
    }, 110);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, open]);

  const seeAll = useCallback(() => {
    router.push(`/browse?q=${encodeURIComponent(q.trim())}`);
    onClose();
  }, [q, router, onClose]);

  const go = useCallback(
    (id: string) => {
      router.push(`/workflow/${encodeURIComponent(id)}`);
      onClose();
    },
    [router, onClose],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    const max = flat.length; // index === flat.length is the "see all" row
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a >= max ? 0 : a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? max : a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active < flat.length) go(flat[active].id);
      else if (q.trim()) seeAll();
    }
  };

  if (!open) return null;

  let runningIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search workflows"
        className="w-full max-w-2xl overflow-hidden rounded-card border border-edge-strong bg-surface shadow-float"
      >
        <div className="flex items-center gap-3 border-b border-edge-subtle px-4">
          <Search size={18} className="flex-none text-tertiary" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search 52,160 workflows…"
            aria-label="Search workflows"
            className="h-14 w-full bg-transparent text-body text-primary outline-none"
          />
          <kbd className="flex-none rounded-token border border-edge-subtle px-1.5 py-0.5 font-mono text-micro text-meta">
            esc
          </kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto">
          {q.trim().length < 2 && (
            <p className="px-4 py-6 text-small text-meta">
              Type at least two characters. Search covers titles, filename tags, node kinds
              and model names.
            </p>
          )}

          {q.trim().length >= 2 && !loading && data && data.total === 0 && (
            <p className="px-4 py-6 text-small text-secondary">
              No workflow matches “{q.trim()}”.
            </p>
          )}

          {data?.groups.map((group) => (
            <div key={group.cat}>
              <div className="flex items-center gap-2 px-4 pb-1 pt-3">
                <span
                  className="font-mono text-micro font-semibold"
                  style={{ color: categoryColor(group.cat) }}
                >
                  {group.cat}
                </span>
                <span className="text-micro text-meta">{categoryName(group.cat)}</span>
              </div>
              {group.items.map((item) => {
                runningIndex += 1;
                const idx = runningIndex;
                const isActive = idx === active;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => go(item.id)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-hover ${
                      isActive ? 'bg-ember-wash' : 'hover:bg-surface-2'
                    }`}
                  >
                    <span
                      aria-hidden
                      className="h-5 w-[3px] flex-none rounded-full"
                      style={{ background: categoryColor(item.cat) }}
                    />
                    <span className="min-w-0 flex-1 truncate text-small text-primary">
                      {item.title}
                    </span>
                    <span className="flex-none font-mono text-micro text-meta">
                      {outputLabel(item.out)}
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
              onClick={seeAll}
              className={`flex w-full items-center justify-between border-t border-edge-subtle px-4 py-3 text-left transition-colors duration-hover ${
                active === flat.length ? 'bg-ember-wash' : 'hover:bg-surface-2'
              }`}
            >
              <span className="text-small text-ember">
                See all {num(data.total)} results for “{q.trim()}”
              </span>
              <span aria-hidden className="text-small text-ember">
                →
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Wires ⌘K / Ctrl-K globally and owns the palette's open state. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    // Prevent the page behind the dialog from scrolling while it is open.
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return { open, setOpen };
}
