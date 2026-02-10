import { NextResponse, type NextRequest } from 'next/server';
import { unlink } from 'fs/promises';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
import { resolveUploadPath } from '@/lib/storage';

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
    const media = await prisma.media.findMany({
      where: { id: { in: mediaIds } },
      select: {
        id: true,
        storagePath: true,
        convertedPath: true,
        previewPath: true,
      },
    });

    if (media.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    await prisma.media.deleteMany({
      where: { id: { in: media.map((item) => item.id) } },
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
