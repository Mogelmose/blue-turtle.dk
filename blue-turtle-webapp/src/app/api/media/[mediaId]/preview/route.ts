import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
import { resolveUploadPath } from '@/lib/storage';
import { isSignedRequest } from '@/lib/signedUrl';

export const runtime = 'nodejs';
const CACHE_CONTROL = 'private, max-age=300, stale-while-revalidate=86400';

function buildCacheHeaders(fileStat: { size: number; mtime: Date; mtimeMs: number }) {
  const etag = `W/\"${fileStat.size}-${fileStat.mtimeMs}\"`;
  return {
    'Cache-Control': CACHE_CONTROL,
    ETag: etag,
    'Last-Modified': fileStat.mtime.toUTCString(),
  };
}

function isNotModified(request: Request, etag: string, lastModified: string) {
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch && ifNoneMatch === etag) {
    return true;
  }
  const ifModifiedSince = request.headers.get('if-modified-since');
  if (ifModifiedSince) {
    const since = new Date(ifModifiedSince).getTime();
    const modified = new Date(lastModified).getTime();
    if (!Number.isNaN(since) && since >= modified) {
      return true;
    }
  }
  return false;
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const signed = isSignedRequest(request);
  const session = signed ? null : await getServerSession(authOptions);
  if (!signed && !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { mediaId } = await params;
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      select: { previewPath: true },
    });

    if (!media?.previewPath) {
      return new NextResponse(null, { status: 204 });
    }

    const absolutePath = resolveUploadPath(media.previewPath);
    const fileStat = await stat(absolutePath);
    const cacheHeaders = buildCacheHeaders(fileStat);
    if (!signed && isNotModified(request, cacheHeaders.ETag, cacheHeaders['Last-Modified'])) {
      return new NextResponse(null, { status: 304, headers: cacheHeaders });
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': fileStat.size.toString(),
        'Content-Disposition': `inline; filename="${mediaId}-poster.jpg"`,
        ...cacheHeaders,
      },
    });
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return new NextResponse(null, { status: 204 });
    }
    console.error('Preview head failed:', error);
    return NextResponse.json(
      { error: 'Noget gik galt.' },
      { status: 500 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const signed = isSignedRequest(request);
  const session = signed ? null : await getServerSession(authOptions);
  if (!signed && !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { mediaId } = await params;
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      select: { previewPath: true },
    });

    if (!media?.previewPath) {
      return new NextResponse(null, { status: 204 });
    }

    const absolutePath = resolveUploadPath(media.previewPath);
    const fileStat = await stat(absolutePath);
    const cacheHeaders = buildCacheHeaders(fileStat);
    if (!signed && isNotModified(request, cacheHeaders.ETag, cacheHeaders['Last-Modified'])) {
      return new NextResponse(null, { status: 304, headers: cacheHeaders });
    }
    const stream = createReadStream(absolutePath);
    const body = Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>;

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': fileStat.size.toString(),
        'Content-Disposition': `inline; filename="${mediaId}-poster.jpg"`,
        ...cacheHeaders,
      },
    });
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return new NextResponse(null, { status: 204 });
    }
    console.error('Preview fetch failed:', error);
    return NextResponse.json(
      { error: 'Noget gik galt.' },
      { status: 500 },
    );
  }
}
