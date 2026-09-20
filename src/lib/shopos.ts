/**
 * Handing a workflow to ShopOS.
 *
 * The platform's own import endpoint is not documented here, so the flow does the one
 * thing that is guaranteed to work: it puts the workflow's JSON on the clipboard and
 * opens the Spacelab canvas, where it can be pasted straight in. The download stays
 * available for anyone who would rather import from a file.
 *
 * If the platform later exposes a URL-driven import, set NEXT_PUBLIC_SHOPOS_IMPORT_URL
 * to a template containing `{url}` (the public URL of the .json) and/or `{id}`. When a
 * template is configured the button navigates straight to it and skips the clipboard
 * step entirely — no other code has to change.
 */

/** Canvas to open when no import template is configured. */
export const SPACELAB_URL =
  process.env.NEXT_PUBLIC_SHOPOS_SPACELAB_URL ??
  'https://app.shopos.ai/spacelab/w/wf_01M2Z5M41BEZ6GPSBA3V7V4FS4/edit';

/** Where a visitor's own spaces live, linked from the docs and the import dialog. */
export const SPACES_URL =
  process.env.NEXT_PUBLIC_SHOPOS_SPACES_URL ?? 'https://app.shopos.ai/spaces?tab=your-spaces';

/** Optional `{url}` / `{id}` template for a direct, one-click import. */
export const IMPORT_TEMPLATE = process.env.NEXT_PUBLIC_SHOPOS_IMPORT_URL ?? '';

export function downloadPath(id: string): string {
  return `/api/download/${encodeURIComponent(id)}`;
}

/** Absolute URL of the raw .json — what a URL-driven import would need to fetch. */
export function publicFileUrl(id: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}${downloadPath(id)}`;
}

/** The URL the import button should open, or null when the clipboard flow applies. */
export function directImportUrl(id: string, origin?: string): string | null {
  if (!IMPORT_TEMPLATE) return null;
  return IMPORT_TEMPLATE.replace('{url}', encodeURIComponent(publicFileUrl(id, origin))).replace(
    '{id}',
    encodeURIComponent(id),
  );
}
