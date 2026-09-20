'use client';

import { useCallback, useState } from 'react';

import {
  directImportUrl,
  downloadPath,
  IMPORT_TEMPLATE,
  SPACELAB_URL,
  SPACES_URL,
} from '@/lib/shopos';
import { Check, Close, Download, ExternalLink } from './icons';
import { toast } from './toast';

type Phase = 'idle' | 'working' | 'ready';

/**
 * Copy that works outside a secure context and where the async Clipboard API is
 * unavailable or permission-blocked, without ever navigating the page away.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * "Open in ShopOS" — copies the workflow JSON, then opens the Spacelab canvas so it can
 * be pasted in. Where a direct import URL is configured, it skips straight to that.
 */
export function ImportButton({
  id,
  title,
  variant = 'primary',
  className = '',
}: {
  id: string;
  title: string;
  variant?: 'primary' | 'secondary' | 'icon';
  className?: string;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [dialog, setDialog] = useState(false);
  const [copied, setCopied] = useState(true);

  const run = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // A configured template means the platform can pull the file itself.
      const direct = directImportUrl(id);
      if (direct) {
        window.open(direct, '_blank', 'noopener,noreferrer');
        return;
      }

      setPhase('working');
      let ok = false;
      try {
        const res = await fetch(downloadPath(id));
        ok = await copyText(await res.text());
      } catch {
        ok = false;
      }
      // The dialog opens either way. If the copy was refused it says so and offers the
      // download instead — the page is never navigated away from behind the user's back.
      setCopied(ok);
      setPhase('ready');
      setDialog(true);
      if (!ok) toast('Clipboard unavailable — download the .json instead');
    },
    [id],
  );

  const label = phase === 'working' ? 'Copying…' : 'Open in ShopOS';

  const styles = {
    primary:
      'h-11 px-5 rounded-card bg-ember text-ember-contrast font-semibold shadow-lift hover:brightness-110',
    secondary:
      'h-11 px-4 rounded-card border border-edge-subtle bg-surface-2 text-primary hover:border-edge-strong',
    icon: 'h-8 w-8 rounded-chip border border-edge-subtle bg-surface-2 text-secondary hover:border-ember hover:bg-ember-wash hover:text-ember justify-center',
  }[variant];

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={phase === 'working'}
        aria-label={variant === 'icon' ? `Open ${title} in ShopOS` : undefined}
        title={variant === 'icon' ? 'Open in ShopOS' : undefined}
        className={`inline-flex flex-none items-center gap-2 text-small transition-all duration-hover disabled:opacity-70 ${styles} ${className}`}
      >
        <ExternalLink size={variant === 'icon' ? 14 : 16} />
        {variant !== 'icon' && label}
      </button>

      {dialog && (
        <ImportDialog
          id={id}
          title={title}
          copied={copied}
          onClose={() => setDialog(false)}
        />
      )}
    </>
  );
}

/**
 * Shown once the JSON is on the clipboard. It states plainly what happened and what to
 * do next rather than claiming an import took place.
 */
function ImportDialog({
  id,
  title,
  copied,
  onClose,
}: {
  id: string;
  title: string;
  copied: boolean;
  onClose: () => void;
}) {
  const open = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-4 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Open in ShopOS"
        className="w-full max-w-lg overflow-hidden rounded-panel border border-edge-strong bg-surface shadow-float"
      >
        <div className="flex items-start gap-3 border-b border-edge-subtle p-5">
          <span
            className={`mt-0.5 grid h-8 w-8 flex-none place-content-center rounded-chip border ${
              copied
                ? 'border-[color:color-mix(in_srgb,var(--signal-ok)_32%,transparent)] bg-[color:color-mix(in_srgb,var(--signal-ok)_12%,transparent)] text-signal-ok'
                : 'border-[color:color-mix(in_srgb,var(--ember)_32%,transparent)] bg-ember-wash text-ember'
            }`}
          >
            {copied ? <Check size={16} /> : <Download size={16} />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-heading-s text-primary">
              {copied ? 'Workflow copied to your clipboard' : 'Download the workflow instead'}
            </h2>
            <p className="mt-1 truncate text-small text-secondary">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 flex-none place-content-center rounded-chip text-secondary hover:bg-surface-2 hover:text-primary"
          >
            <Close size={16} />
          </button>
        </div>

        <ol className="space-y-2.5 p-5">
          {(copied
            ? [
                'Open the Spacelab canvas below.',
                'Paste with ⌘V / Ctrl V — the full node graph lands on the canvas.',
                'Fill the input nodes this workflow flags, then run it.',
              ]
            : [
                'Your browser refused clipboard access, so copy-and-paste is unavailable here.',
                'Download the .json, then import it from the Spacelab canvas.',
                'Fill the input nodes this workflow flags, then run it.',
              ]
          ).map((step, i) => (
            <li key={i} className="flex gap-3 text-small text-secondary">
              <span className="flex-none font-mono text-micro text-meta">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-2 border-t border-edge-subtle bg-surface-2 p-5">
          <button
            type="button"
            onClick={() => open(SPACELAB_URL)}
            className="inline-flex h-11 items-center gap-2 rounded-card bg-ember px-5 text-small font-semibold text-ember-contrast transition-all duration-hover hover:brightness-110"
          >
            <ExternalLink size={16} />
            Open Spacelab canvas
          </button>
          <button
            type="button"
            onClick={() => open(SPACES_URL)}
            className="inline-flex h-11 items-center gap-2 rounded-card border border-edge-subtle px-4 text-small text-primary transition-colors duration-hover hover:border-edge-strong"
          >
            Your spaces
          </button>
          <a
            href={downloadPath(id)}
            download
            onClick={onClose}
            className="btn-download ml-auto"
          >
            <Download size={15} />
            Download instead
          </a>
        </div>

        {!IMPORT_TEMPLATE && (
          <p className="border-t border-edge-subtle px-5 py-3 text-micro text-meta">
            Pasting is used because ShopOS has no documented URL import. Set{' '}
            <code className="font-mono">NEXT_PUBLIC_SHOPOS_IMPORT_URL</code> to a template
            containing <code className="font-mono">{'{url}'}</code> and this button will open
            the import directly instead.
          </p>
        )}
      </div>
    </div>
  );
}
