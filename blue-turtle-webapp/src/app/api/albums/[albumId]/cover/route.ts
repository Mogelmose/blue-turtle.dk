import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import mime from 'mime-types';
import path from 'path';
import { Readable } from 'stream';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
import { resolveUploadPath } from '@/lib/storage';
import { isSignedRequest } from '@/lib/signedUrl';
import { getErrorCode } from '@/lib/error';

export const runtime = 'nodejs';

const CACHE_CONTROL = 'private, max-age=300, stale-while-revalidate=86400';

type CoverContext =
  | {
      absolutePath: string;
      contentType: string;
      filename: string;
      size: number;
      etag: string;
      lastModified: string;
    }
  | { error: NextResponse };

function buildCacheHeaders({ etag, lastModified }: { etag: string; lastModified: string }) {
  return {
    'Cache-Control': CACHE_CONTROL,
    ETag: etag,
    'Last-Modified': lastModified,
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

async function getCoverContext(albumId: string): Promise<CoverContext> {
  if (!albumId) {
    return {
      error: NextResponse.json({ error: 'Invalid album ID.' }, { status: 400 }),
    };
  }

  const album = await prisma.album.findUnique({
    where: { id: albumId },
    select: { coverImage: true },
  });

  if (!album?.coverImage) {
    return {
      error: NextResponse.json({ error: 'Cover not found.' }, { status: 404 }),
    };
  }

  let absolutePath = '';

  try {
    if (album.coverImage.startsWith('/')) {
      const publicRoot = path.resolve(process.cwd(), 'public');
      const relative = album.coverImage.replace(/^\/+/, '');
      const resolved = path.resolve(publicRoot, relative);

      if (resolved !== publicRoot && !resolved.startsWith(`${publicRoot}${path.sep}`)) {
        throw new Error('Cover path escapes public root.');
      }

      absolutePath = resolved;
    } else {
      absolutePath = resolveUploadPath(album.coverImage);
    }
  } catch (error) {
    console.error('Invalid cover path:', error);
    return {
      error: NextResponse.json({ error: 'Cover not found.' }, { status: 404 }),
    };
  }

  const fileStat = await stat(absolutePath);
  const lookup = mime.lookup(album.coverImage);
  const contentType =
    typeof lookup === 'string' ? lookup : 'application/octet-stream';
  const etag = `W/\"${fileStat.size}-${fileStat.mtimeMs}\"`;
  const lastModified = fileStat.mtime.toUTCString();

  return {
    absolutePath,
    contentType,
    filename: path.basename(album.coverImage),
    size: fileStat.size,
    etag,
    lastModified,
  };
}

type RouteContext = { params: Promise<{ albumId: string }> };

export async function HEAD(request: Request, { params }: RouteContext) {
  const signed = isSignedRequest(request);
  const session = signed ? null : await getServerSession(authOptions);
  if (!signed && !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { albumId } = await params;
    const context = await getCoverContext(albumId);

    if ('error' in context) {
      return context.error;
    }

    const cacheHeaders = buildCacheHeaders(context);
    if (!signed && isNotModified(request, context.etag, context.lastModified)) {
      return new NextResponse(null, { status: 304, headers: cacheHeaders });
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': context.contentType,
        'Content-Length': context.size.toString(),
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `inline; filename="${context.filename}"`,
        ...cacheHeaders,
      },
    });
  } catch (error: unknown) {
    if (getErrorCode(error) === 'ENOENT') {
      return NextResponse.json({ error: 'Cover not found.' }, { status: 404 });
    }

    console.error('Cover stream error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 },
    );
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  const signed = isSignedRequest(request);
  const session = signed ? null : await getServerSession(authOptions);
  if (!signed && !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { albumId } = await params;
    const context = await getCoverContext(albumId);

    if ('error' in context) {
      return context.error;
    }

    const cacheHeaders = buildCacheHeaders(context);
    if (!signed && isNotModified(request, context.etag, context.lastModified)) {
      return new NextResponse(null, { status: 304, headers: cacheHeaders });
    }

    const stream = createReadStream(context.absolutePath);
    const body = Readable.toWeb(stream) as unknown as ReadableStream;

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': context.contentType,
        'Content-Length': context.size.toString(),
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `inline; filename="${context.filename}"`,
        ...cacheHeaders,
      },
    });
  } catch (error: unknown) {
    if (getErrorCode(error) === 'ENOENT') {
      return NextResponse.json({ error: 'Cover not found.' }, { status: 404 });
    }

    console.error('Cover stream error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 },
    );
  }
}
