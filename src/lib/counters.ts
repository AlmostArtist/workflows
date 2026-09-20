import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

/**
 * Per-workflow download counters (§7.6).
 *
 * Kept in memory and flushed to a single JSON file on a debounce — this is a
 * static catalogue served from one node process, so a counter store is all that
 * is needed. Swap `load`/`persist` for a KV/Redis client if the site is ever
 * deployed across more than one instance.
 */

const FILE = path.join(process.cwd(), 'data', 'counters.json');

let counts: Map<string, number> | null = null;
let flushTimer: NodeJS.Timeout | null = null;
let dirty = false;

function load(): Map<string, number> {
  if (counts) return counts;
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Record<string, number>;
    counts = new Map(Object.entries(raw));
  } catch {
    counts = new Map();
  }
  return counts;
}

function persist(): void {
  if (!counts || !dirty) return;
  dirty = false;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(Object.fromEntries(counts)));
  } catch {
    // A read-only data dir is survivable — counters degrade to per-process only.
  }
}

export function recordDownload(id: string): number {
  const c = load();
  const next = (c.get(id) ?? 0) + 1;
  c.set(id, next);
  dirty = true;
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      persist();
    }, 2000);
    flushTimer.unref?.();
  }
  return next;
}

export function getDownloadCount(id: string): number {
  return load().get(id) ?? 0;
}

/** Dense count array aligned to the row indices in `rows`. */
export function getDownloadCounts(ids: string[], rows: number[]): Int32Array {
  const c = load();
  const out = new Int32Array(ids.length);
  if (c.size === 0) return out;
  for (const i of rows) out[i] = c.get(ids[i]) ?? 0;
  return out;
}

export function totalDownloads(): number {
  let n = 0;
  for (const v of load().values()) n += v;
  return n;
}
