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

export const runtime = 'nodejs';

type CoverContext =
  | {
      absolutePath: string;
      contentType: string;
      filename: string;
      size: number;
    }
  | { error: NextResponse };

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

  return {
    absolutePath,
    contentType,
    filename: path.basename(album.coverImage),
    size: fileStat.size,
  };
}

type RouteContext = { params: Promise<{ albumId: string }> };

export async function HEAD(_request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { albumId } = await params;
    const context = await getCoverContext(albumId);

    if ('error' in context) {
      return context.error;
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': context.contentType,
        'Content-Length': context.size.toString(),
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `inline; filename="${context.filename}"`,
      },
    });
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return NextResponse.json({ error: 'Cover not found.' }, { status: 404 });
    }

    console.error('Cover stream error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 },
    );
  }
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { albumId } = await params;
    const context = await getCoverContext(albumId);

    if ('error' in context) {
      return context.error;
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
      },
    });
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return NextResponse.json({ error: 'Cover not found.' }, { status: 404 });
    }

    console.error('Cover stream error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 },
    );
  }
}
