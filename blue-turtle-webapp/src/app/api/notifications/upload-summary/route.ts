import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
import { createNotificationsForOtherUsers, NOTIFICATION_TYPES } from '@/lib/notifications';

export const runtime = 'nodejs';

type UploadSummaryBody = {
  albumId?: unknown;
  uploadedCount?: unknown;
};

function isSafeAlbumId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value);
}

function parseUploadedCount(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.min(parsed, 500);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: UploadSummaryBody | null = null;
  try {
    body = (await request.json()) as UploadSummaryBody;
  } catch {
    body = null;
  }

  if (!isSafeAlbumId(body?.albumId)) {
    return NextResponse.json({ success: false, error: 'Invalid album ID' }, { status: 400 });
  }

  const uploadedCount = parseUploadedCount(body?.uploadedCount);
  if (!uploadedCount) {
    return NextResponse.json({ success: false, error: 'Invalid upload count' }, { status: 400 });
  }

  try {
    const actorName = session.user.name?.trim() || 'En bruger';
    const album = await prisma.album.findUnique({
      where: { id: body.albumId },
      select: { id: true, name: true },
    });

    if (!album) {
      return NextResponse.json({ success: false, error: 'Album ikke fundet' }, { status: 404 });
    }

    const mediaLabel = uploadedCount === 1 ? 'medie' : 'medier';
    const message = `${actorName} uploadede ${uploadedCount} ${mediaLabel} til "${album.name}".`;

    await prisma.$transaction(async (tx) => {
      await createNotificationsForOtherUsers(tx, {
        actorUserId: session.user.id,
        type: NOTIFICATION_TYPES.MEDIA_UPLOADED,
        message,
        albumId: album.id,
        mediaId: null,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to create upload summary notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create notification.' },
      { status: 500 },
    );
  }
}
