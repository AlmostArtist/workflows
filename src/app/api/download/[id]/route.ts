import fs from 'node:fs/promises';

import { NextResponse } from 'next/server';

import { getDetail, sourcePath, sourceRelativePath } from '@/lib/catalog';
import { recordDownload } from '@/lib/counters';

export const dynamic = 'force-dynamic';

const GITHUB_LIBRARY_BASE_URL =
  'https://raw.githubusercontent.com/kishorekrazzy/workflows/main/workflow-files';

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
 * request. In the deployed Netlify site the source files live in this repository's
 * `workflow-files/` directory. The function fetches the matching raw GitHub file and
 * returns it as a same-origin attachment, so visitors download only from this website.
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

  // The public GitHub repository is the default production library store. An explicit
  // URL remains available for mirrors, private CDN origins, or a custom domain.
  const remote =
    process.env.WORKFLOWS_DOWNLOAD_BASE_URL ??
    (process.env.NODE_ENV === 'production' ? GITHUB_LIBRARY_BASE_URL : undefined);
  if (remote) {
    const url = remoteDownloadUrl(remote, relativePath);
    if (!url) {
      return NextResponse.json(
        { error: 'WORKFLOWS_DOWNLOAD_BASE_URL is not a valid absolute URL.' },
        { status: 500 },
      );
    }
    let upstream: Response;
    try {
      upstream = await fetch(url, { cache: 'force-cache' });
    } catch {
      return NextResponse.json({ error: 'Workflow file host is unavailable.' }, { status: 502 });
    }
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Workflow file is unavailable (${upstream.status}).` },
        { status: upstream.status === 404 ? 404 : 502 },
      );
    }

    recordDownload(id);
    return new NextResponse(upstream.body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Workflow-Id': id,
      },
    });
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
