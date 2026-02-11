import { NextResponse, type NextRequest } from 'next/server';
import { unlink } from 'fs/promises';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
import { resolveUploadPath } from '@/lib/storage';
import { createNotificationsForOtherUsers, NOTIFICATION_TYPES } from '@/lib/notifications';

export const runtime = 'nodejs';

type DeleteRequestBody = {
  mediaIds?: unknown;
};

function normalizeMediaIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids = value.filter((id): id is string => typeof id === 'string');
  return Array.from(new Set(ids));
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

  const mediaIds = normalizeMediaIds(body?.mediaIds);
  if (mediaIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No media selected.' },
      { status: 400 },
    );
  }

  try {
    const actorName = session.user.name?.trim() || 'En bruger';
    const media = await prisma.media.findMany({
      where: { id: { in: mediaIds } },
      select: {
        id: true,
        albumId: true,
        storagePath: true,
        convertedPath: true,
        previewPath: true,
        album: {
          select: {
            name: true,
          },
        },
      },
    });

    if (media.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const deletedMedia = media.map((item) => ({
      id: item.id,
      albumId: item.albumId,
    }));

    await prisma.$transaction(async (tx) => {
      await tx.media.deleteMany({
        where: { id: { in: deletedMedia.map((item) => item.id) } },
      });

      const primaryAlbumId = deletedMedia[0]?.albumId ?? null;
      const albumNames = Array.from(
        new Set(
          media
            .map((item) => item.album?.name)
            .filter((name): name is string => Boolean(name)),
        ),
      );
      const summaryMessage =
        deletedMedia.length === 1
          ? albumNames.length === 1
            ? `${actorName} slettede 1 medie fra "${albumNames[0]}".`
            : `${actorName} slettede 1 medie.`
          : albumNames.length === 1
            ? `${actorName} slettede ${deletedMedia.length} medier fra "${albumNames[0]}".`
            : `${actorName} slettede ${deletedMedia.length} medier fordelt på ${albumNames.length} albums.`;

      await createNotificationsForOtherUsers(tx, {
        actorUserId: session.user.id,
        type: NOTIFICATION_TYPES.MEDIA_DELETED,
        message: summaryMessage,
        albumId: primaryAlbumId,
        mediaId: deletedMedia.length === 1 ? deletedMedia[0].id : null,
      });
    });

    const paths = media.flatMap((item) =>
      [item.storagePath, item.convertedPath, item.previewPath].filter(
        (value): value is string => typeof value === 'string' && value.length > 0,
      ),
    );

    await Promise.all(
      paths.map(async (relativePath) => {
        try {
          const absolutePath = resolveUploadPath(relativePath);
          await unlink(absolutePath);
        } catch (error) {
          console.warn('Failed to delete media file:', relativePath, error);
        }
      }),
    );

    return NextResponse.json({ success: true, deleted: media.length });
  } catch (error) {
    console.error('Bulk media delete failed:', error);
    return NextResponse.json(
      { success: false, error: 'Delete failed.' },
      { status: 500 },
    );
  }
}
