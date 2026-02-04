import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
import { resolveUploadPath } from '@/lib/storage';

export const runtime = 'nodejs';

export async function HEAD(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
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

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': fileStat.size.toString(),
        'Content-Disposition': `inline; filename="${mediaId}-poster.jpg"`,
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
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
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
    const stream = createReadStream(absolutePath);
    const body = Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>;

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': fileStat.size.toString(),
        'Content-Disposition': `inline; filename="${mediaId}-poster.jpg"`,
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
