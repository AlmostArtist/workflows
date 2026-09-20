'use client';

import { Copy } from './icons';
import { toast } from './toast';

/** Primary download action on the detail page. Says exactly what it does (§10). */
export { DownloadJson } from './download-button';

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
      className="btn-lux btn-lux-ghost inline-flex h-11 items-center gap-2 px-4 text-small font-medium"
    >
      <Copy size={16} />
      Copy import path
    </button>
  );
}
