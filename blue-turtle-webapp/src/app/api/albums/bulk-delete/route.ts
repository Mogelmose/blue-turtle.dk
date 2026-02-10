import { NextResponse, type NextRequest } from 'next/server';
import { rm, unlink } from 'fs/promises';
import path from 'path';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
import { resolveUploadPath } from '@/lib/storage';

export const runtime = 'nodejs';

type DeleteRequestBody = {
  albumIds?: unknown;
};

function normalizeAlbumIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids = value.filter((id): id is string => typeof id === 'string');
  return Array.from(new Set(ids));
}

function isSafeAlbumId(id: string): boolean {
  if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
    return false;
  }
  return /^[A-Za-z0-9_-]+$/.test(id);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: DeleteRequestBody | null = null;
  try {
    body = (await request.json()) as DeleteRequestBody;
  } catch {
    body = null;
  }

  const requestedIds = normalizeAlbumIds(body?.albumIds).filter(isSafeAlbumId);
  if (requestedIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No albums selected.' },
      { status: 400 },
    );
  }

  try {
    const albums = await prisma.album.findMany({
      where: { id: { in: requestedIds } },
      select: { id: true, coverImage: true },
    });

    if (albums.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const albumIds = albums.map((album) => album.id);

    const media = await prisma.media.findMany({
      where: { albumId: { in: albumIds } },
      select: {
        storagePath: true,
        convertedPath: true,
        previewPath: true,
      },
    });

    await prisma.media.deleteMany({
      where: { albumId: { in: albumIds } },
    });

    await prisma.album.deleteMany({
      where: { id: { in: albumIds } },
    });

    const paths = [
      ...media.flatMap((item) =>
        [item.storagePath, item.convertedPath, item.previewPath].filter(
          (value): value is string => typeof value === 'string' && value.length > 0,
        ),
      ),
      ...albums
        .map((album) => album.coverImage)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    ];

    await Promise.all(
      paths.map(async (relativePath) => {
        try {
          const absolutePath = resolveUploadPath(relativePath);
          await unlink(absolutePath);
        } catch (error) {
          console.warn('Failed to delete file:', relativePath, error);
        }
      }),
    );

    await Promise.all(
      albumIds.map(async (albumId) => {
        const relativeRoot = path.posix.join('albums', albumId);
        try {
          const absoluteRoot = resolveUploadPath(relativeRoot);
          await rm(absoluteRoot, { recursive: true, force: true });
        } catch (error) {
          console.warn('Failed to delete album folder:', relativeRoot, error);
        }
      }),
    );

    return NextResponse.json({ success: true, deleted: albumIds.length });
  } catch (error) {
    console.error('Bulk album delete failed:', error);
    return NextResponse.json(
      { success: false, error: 'Delete failed.' },
      { status: 500 },
    );
  }
}
