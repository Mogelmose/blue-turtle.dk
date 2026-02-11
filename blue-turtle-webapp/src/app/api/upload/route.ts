import { NextResponse, type NextRequest } from 'next/server';
import { createWriteStream } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { randomUUID } from 'crypto';
import mime from 'mime-types';
import prisma from '@/lib/prisma';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { createNotificationsForOtherUsers, NOTIFICATION_TYPES } from '@/lib/notifications';
import {
  buildMediaRelativePath,
  buildConvertedRelativePath,
  buildPreviewRelativePath,
  getMonthFolder,
  resolveUploadPath,
  sanitizeFilename,
} from '@/lib/storage';

export const runtime = 'nodejs';

const ALLOWED_FILE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

const HEIC_MIME_TYPES = new Set(['image/heic', 'image/heif']);
const HEIC_EXTENSIONS = new Set(['heic', 'heif']);
const VIDEO_MIME_PREFIX = 'video/';
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov']);

function resolveMimeType(file: File): string | null {
  if (file.type) {
    return file.type.toLowerCase();
  }

  const lookup = mime.lookup(file.name);
  if (typeof lookup === 'string') {
    return lookup.toLowerCase();
  }

  const extension = path.extname(file.name).slice(1).toLowerCase();
  return EXTENSION_TO_MIME[extension] ?? null;
}

function isSafeAlbumId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value);
}

function parseBooleanFlag(value: FormDataEntryValue | null): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const actorName = session.user.name?.trim() || 'En bruger';
    const data = await request.formData();

    const albumIdRaw = data.get('albumId');
    if (!isSafeAlbumId(albumIdRaw)) {
      return NextResponse.json({ success: false, error: 'Invalid album ID' }, { status: 400 });
    }
    const albumId = albumIdRaw;

    const fileRaw = data.get('file');
    if (!(fileRaw instanceof File)) {
      return NextResponse.json({ success: false, error: 'Mangler fil' }, { status: 400 });
    }
    const file = fileRaw;
    const suppressNotification = parseBooleanFlag(data.get('suppressNotification'));

    let resolvedMimeType = resolveMimeType(file);
    const extension = path.extname(file.name).slice(1).toLowerCase();
    const extensionMimeType = EXTENSION_TO_MIME[extension];
    const isAllowedMime = resolvedMimeType && ALLOWED_FILE_TYPES.has(resolvedMimeType);
    const isAllowedExtension = extensionMimeType && ALLOWED_FILE_TYPES.has(extensionMimeType);

    if (!isAllowedMime && isAllowedExtension) {
      resolvedMimeType = extensionMimeType;
    }

    if (!resolvedMimeType || (!isAllowedMime && !isAllowedExtension)) {
      return NextResponse.json({ success: false, error: 'Ikke tilladt filtype.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: 'Filen er for stor.' }, { status: 400 });
    }

    const album = await prisma.album.findUnique({
      where: { id: albumId },
      select: { id: true, name: true },
    });
    if (!album) {
      return NextResponse.json({ success: false, error: 'Album ikke fundet' }, { status: 404 });
    }

    const sanitized = sanitizeFilename(file.name);
    const mediaId = randomUUID();
    const monthFolder = getMonthFolder();
    const filename = `${mediaId}-${sanitized}`;
    const relativePath = buildMediaRelativePath(albumId, monthFolder, filename);
    const absolutePath = resolveUploadPath(relativePath);
    const isHeic =
      HEIC_MIME_TYPES.has(resolvedMimeType) || HEIC_EXTENSIONS.has(extension);
    const isVideo =
      resolvedMimeType.startsWith(VIDEO_MIME_PREFIX) ||
      VIDEO_EXTENSIONS.has(extension);
    const convertedPath = isHeic
      ? buildConvertedRelativePath(albumId, mediaId, '.jpg')
      : null;
    const previewPath = isVideo
      ? buildPreviewRelativePath(albumId, mediaId, '.jpg')
      : null;

    await mkdir(path.dirname(absolutePath), { recursive: true });

    const nodeStream = Readable.fromWeb(
      file.stream() as unknown as import('stream/web').ReadableStream,
    );
    await pipeline(nodeStream, createWriteStream(absolutePath));

    const mediaUrl = `/api/media/${mediaId}`;

    try {
      const newMedia = await prisma.$transaction(async (tx) => {
        const created = await tx.media.create({
          data: {
            id: mediaId,
            url: mediaUrl,
            albumId,
            mimeType: resolvedMimeType,
            originalName: file.name,
            sizeBytes: file.size,
            filename,
            storagePath: relativePath,
            convertedPath,
            previewPath,
            metadataStatus: 'PENDING',
          },
        });

        await tx.job.create({
          data: {
            type: 'EXTRACT_METADATA',
            payload: { mediaId: created.id },
            status: 'PENDING',
          },
        });

        if (!suppressNotification) {
          await createNotificationsForOtherUsers(tx, {
            actorUserId: session.user.id,
            type: NOTIFICATION_TYPES.MEDIA_UPLOADED,
            message: `${actorName} uploadede "${created.originalName || created.filename || 'et medie'}" til "${album.name}".`,
            albumId,
            mediaId: created.id,
          });
        }

        if (isHeic) {
          await tx.job.create({
            data: {
              type: 'CONVERT_HEIC',
              payload: { mediaId: created.id },
              status: 'PENDING',
            },
          });
        }

        if (isVideo) {
          await tx.job.create({
            data: {
              type: 'GENERATE_VIDEO_PREVIEW',
              payload: { mediaId: created.id },
              status: 'PENDING',
            },
          });
        }

        return created;
      });

      return NextResponse.json({ success: true, media: newMedia }, { status: 201 });
    } catch (error) {
      await unlink(absolutePath).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: 'Upload fejlede.' }, { status: 500 });
  }
}
