import { NextResponse, type NextRequest } from 'next/server';
import { rm, unlink } from 'fs/promises';
import path from 'path';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
import { resolveUploadPath } from '@/lib/storage';
import { createNotificationsForOtherUsers, NOTIFICATION_TYPES } from '@/lib/notifications';

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
    const actorName = session.user.name?.trim() || 'En bruger';
    const albums = await prisma.album.findMany({
      where: { id: { in: requestedIds } },
      select: { id: true, name: true, coverImage: true },
    });

    if (albums.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const albumIds = albums.map((album) => album.id);

    const media = await prisma.media.findMany({
      where: { albumId: { in: albumIds } },
      select: {
        id: true,
        albumId: true,
        storagePath: true,
        convertedPath: true,
        previewPath: true,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.media.deleteMany({
        where: { albumId: { in: albumIds } },
      });

      await tx.album.deleteMany({
        where: { id: { in: albumIds } },
      });

      const albumNames = albums.map((album) => album.name);
      const albumPreview = albumNames.slice(0, 3).map((name) => `"${name}"`).join(', ');
      const albumSummaryMessage =
        albumIds.length === 1
          ? `${actorName} slettede albummet "${albumNames[0]}".`
          : albumIds.length <= 3
            ? `${actorName} slettede ${albumIds.length} albums: ${albumPreview}.`
            : `${actorName} slettede ${albumIds.length} albums: ${albumPreview} og ${albumIds.length - 3} flere.`;

      await createNotificationsForOtherUsers(tx, {
        actorUserId: session.user.id,
        type: NOTIFICATION_TYPES.ALBUM_DELETED,
        message: albumSummaryMessage,
        albumId: albumIds.length === 1 ? albumIds[0] : null,
      });

      if (media.length > 0) {
        const albumNameById = new Map(albums.map((album) => [album.id, album.name]));
        const mediaAlbumNames = Array.from(
          new Set(
            media
              .map((item) => albumNameById.get(item.albumId))
              .filter((name): name is string => Boolean(name)),
          ),
        );
        const mediaSummaryMessage =
          mediaAlbumNames.length === 1
            ? `${actorName} slettede ${media.length} medier fra "${mediaAlbumNames[0]}".`
            : `${actorName} slettede ${media.length} medier fordelt på ${mediaAlbumNames.length} albums.`;

        await createNotificationsForOtherUsers(tx, {
          actorUserId: session.user.id,
          type: NOTIFICATION_TYPES.MEDIA_DELETED,
          message: mediaSummaryMessage,
          albumId: albumIds.length === 1 ? albumIds[0] : null,
        });
      }
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
