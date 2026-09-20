'use client';

import { Download } from './icons';

/**
 * The one download control in the system.
 *
 * Three sizes of the same object rather than three different buttons: `lead` for the
 * detail page, `inline` for list rows, `icon` for dense card footers. All of them carry
 * the `.btn-lux` treatment — hairline edge, shallow top-light, and a specular sweep that
 * crosses on hover — so the action reads the same wherever it appears.
 */
export function DownloadJson({
  id,
  filename,
  sizeLabel,
  variant = 'inline',
  tone = 'ghost',
  className = '',
}: {
  id: string;
  /** Used for the accessible label so screen readers hear what is being saved. */
  filename?: string;
  sizeLabel?: string;
  variant?: 'lead' | 'inline' | 'icon';
  tone?: 'solid' | 'ghost';
  className?: string;
}) {
  const dims = {
    lead: 'h-11 px-5 text-small gap-2',
    inline: 'h-11 w-11 sm:h-8 sm:w-auto sm:px-3 text-micro gap-1.5',
    icon: 'h-11 w-11 sm:h-8 sm:w-8 gap-0',
  }[variant];

  const label = filename ? `Download ${filename}` : 'Download .json';

  return (
    <a
      href={`/api/download/${encodeURIComponent(id)}`}
      download
      onClick={(e) => e.stopPropagation()}
      aria-label={label}
      title={variant === 'icon' ? label : undefined}
      className={`btn-lux btn-lux-${tone} inline-flex flex-none items-center justify-center font-medium ${dims} ${className}`}
    >
      <Download size={variant === 'lead' ? 17 : 15} />
      {variant === 'lead' && (
        <>
          <span>Download .json</span>
          {sizeLabel && <span className="font-mono tnum opacity-70">{sizeLabel}</span>}
        </>
      )}
      {variant === 'inline' && <span className="hidden font-mono sm:inline">.json</span>}
    </a>
  );
}
