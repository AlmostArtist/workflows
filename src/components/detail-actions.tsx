'use client';

import { Copy, Download } from './icons';
import { toast } from './toast';

/** Primary download action on the detail page. Says exactly what it does (§10). */
export function DownloadButton({ id, sizeLabel }: { id: string; sizeLabel: string }) {
  return (
    <a
      href={`/api/download/${encodeURIComponent(id)}`}
      download
      onClick={() => toast('JSON download started')}
      className="btn-download"
    >
      <Download size={17} />
      Download .json
      <span className="font-mono tnum opacity-70">{sizeLabel}</span>
    </a>
  );
}

/**
 * Copies the library-relative path of the source file, which is what someone needs when
 * they already have the catalogue on disk and want to find this exact one.
 */
export function CopyPathButton({ file, cat }: { file: string; cat: string }) {
  const dirs: Record<string, string> = {
    J: '500-Omni-Images',
    K: 'image',
    L: 'video',
    M: 'viral',
    N: '100-Images',
  };
  const path = `${dirs[cat] ?? cat}/${file}`;

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(path);
          toast('Copied import path');
        } catch {
          toast('Clipboard unavailable — path is ' + path);
        }
      }}
      className="inline-flex h-11 items-center gap-2 rounded-card border border-edge-subtle bg-surface-2 px-4 text-small text-primary transition-colors duration-hover hover:border-edge-strong"
    >
      <Copy size={16} />
      Copy import path
    </button>
  );
}
