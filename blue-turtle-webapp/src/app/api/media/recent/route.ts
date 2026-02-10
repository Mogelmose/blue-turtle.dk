import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
import { buildSignedMediaUrl } from '@/lib/signedUrl';

const MAX_TAKE = 24;
const DEFAULT_TAKE = 8;

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const skip = parsePositiveInt(searchParams.get('skip'), 0);
  const rawTake = parsePositiveInt(searchParams.get('take'), DEFAULT_TAKE);
  const take = Math.min(rawTake, MAX_TAKE);

  try {
    const media = await prisma.media.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        url: true,
        mimeType: true,
        createdAt: true,
        album: { select: { id: true, name: true } },
      },
    });

    const items = media.map((item) => ({
      id: item.id,
      url: buildSignedMediaUrl(item.url, item.mimeType ?? null),
      mimeType: item.mimeType ?? null,
      createdAt: item.createdAt,
      albumId: item.album.id,
      albumName: item.album.name,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Recent media fetch failed:', error);
    return NextResponse.json({ error: 'Noget gik galt.' }, { status: 500 });
  }
}
