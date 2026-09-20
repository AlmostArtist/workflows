import fs from 'node:fs/promises';

import { NextResponse } from 'next/server';

import { getDetail, sourcePath, sourceRelativePath } from '@/lib/catalog';
import { recordDownload } from '@/lib/counters';

export const dynamic = 'force-dynamic';

function remoteDownloadUrl(base: string, relativePath: string): URL | null {
  try {
    const root = new URL(base.endsWith('/') ? base : `${base}/`);
    const encodedPath = relativePath.split('/').map(encodeURIComponent).join('/');
    const url = new URL(encodedPath, root);
    return url.href.startsWith(root.href) ? url : null;
  } catch {
    return null;
  }
}

/**
 * §7.6 — serves the real `.json` straight from the library folder and increments the
 * per-workflow counter that powers the "Most downloaded" sort.
 *
 * The files are already individual JSONs on disk, so nothing is zipped or unzipped per
 * request. Behind a CDN, point `WORKFLOWS_LIBRARY_ROOT` at a mounted object store or
 * replace the body below with a signed-URL redirect — the counter call stays the same.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const relativePath = sourceRelativePath(id);
  if (!relativePath) {
    return NextResponse.json({ error: `Unknown workflow id: ${id}` }, { status: 404 });
  }

  const detail = getDetail(id);
  const filename = detail?.file ?? `${id}.json`;

  // Serverless hosts do not have the local 674 MB library mounted. Configure a CDN or
  // bucket URL that preserves the A/.../N/... directory structure and downloads redirect
  // straight to it, leaving the app's serverless function small and fast.
  const remote = process.env.WORKFLOWS_DOWNLOAD_BASE_URL;
  if (remote) {
    const url = remoteDownloadUrl(remote, relativePath);
    if (!url) {
      return NextResponse.json(
        { error: 'WORKFLOWS_DOWNLOAD_BASE_URL is not a valid absolute URL.' },
        { status: 500 },
      );
    }
    recordDownload(id);
    const response = NextResponse.redirect(url, 307);
    response.headers.set('X-Workflow-Id', id);
    response.headers.set('X-Workflow-Filename', filename);
    return response;
  }

  const file = sourcePath(id);
  if (!file) {
    return NextResponse.json({ error: `Unknown workflow id: ${id}` }, { status: 404 });
  }

  let body: Buffer;
  try {
    body = await fs.readFile(file);
  } catch {
    return NextResponse.json(
      { error: `Source file is missing from the library root for ${id}.` },
      { status: 404 },
    );
  }

  recordDownload(id);

  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': String(body.byteLength),
      'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Workflow-Id': id,
    },
  });
}
