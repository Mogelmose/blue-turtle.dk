import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { sessionAuthOptions as authOptions } from '../../../../lib/auth';
import { createWriteStream } from 'fs';
import { mkdir, mkdtemp, rm, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import mime from 'mime-types';
import {
  buildAlbumCoverRelativePath,
  resolveUploadPath,
  sanitizeExtension,
} from '../../../../lib/storage';
import { convertHeicToJpeg } from '../../../../lib/heic';
import { createNotificationsForOtherUsers, NOTIFICATION_TYPES } from '../../../../lib/notifications';

export const runtime = 'nodejs';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const HEIC_MIME_TYPES = new Set(['image/heic', 'image/heif']);

const EXTENSION_TO_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function resolveImageMimeType(file) {
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

function resolveFileExtension(fileName, mimeType) {
  const fromName = path.extname(fileName);
  if (fromName) {
    return fromName;
  }

  if (!mimeType) {
    return '';
  }

  const fromMime = mime.extension(mimeType);
  return fromMime ? `.${fromMime}` : '';
}

export async function GET(_request, { params }) {
  try {
    const { albumId } = await params;
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      include: { media: true },
    });

    if (!album) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(album);
  } catch (error) {
    console.error('Failed to fetch album:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch album' },
      { status: 500 },
    );
  }
}

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Not authorized' },
      { status: 401 },
    );
  }

  try {
    const { albumId } = await params;
    const existingAlbum = await prisma.album.findUnique({
      where: { id: albumId },
      select: { coverImage: true },
    });

    if (!existingAlbum) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 },
      );
    }

    const contentType = request.headers.get('content-type') ?? '';
    let name = null;
    let infoText = null;
    let category = null;
    let coverImageFile = null;
    let latitude = null;
    let longitude = null;
    let locationName = null;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      name = body?.name ?? null;
      infoText = body?.infoText ?? null;
      category = body?.category ?? null;
      latitude = body?.latitude ?? null;
      longitude = body?.longitude ?? null;
      locationName = body?.locationName ?? null;
    } else {
      const formData = await request.formData();
      name = formData.get('name');
      infoText = formData.get('infoText');
      category = formData.get('category');
      coverImageFile = formData.get('coverImage');
      latitude = formData.get('latitude');
      longitude = formData.get('longitude');
      locationName = formData.get('locationName');
    }

    if (typeof name !== 'string' || typeof category !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Navn og kategori er paISkrAA?vet' },
        { status: 400 },
      );
    }

    if (!name || !category) {
      return NextResponse.json(
        { success: false, error: 'Navn og kategori er paISkrAÝvet' },
        { status: 400 },
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Navn skal vAÝre under 50 tegn.' },
        { status: 400 },
      );
    }

    if (!['REJSER', 'SPILLEAFTEN', 'JULEFROKOST'].includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category.' },
        { status: 400 },
      );
    }

    let coverImagePath = existingAlbum.coverImage ?? null;
    let coverAbsolutePath = null;

    if (coverImageFile instanceof File && coverImageFile.size > 0) {
      const resolvedMimeType = resolveImageMimeType(coverImageFile);
      const extension = path.extname(coverImageFile.name).slice(1).toLowerCase();
      const extensionMimeType = EXTENSION_TO_MIME[extension];
      const isAllowedMime =
        resolvedMimeType && ALLOWED_IMAGE_MIME_TYPES.has(resolvedMimeType);
      const isAllowedExtension =
        extensionMimeType && ALLOWED_IMAGE_MIME_TYPES.has(extensionMimeType);

      const finalMimeType =
        !isAllowedMime && isAllowedExtension ? extensionMimeType : resolvedMimeType;

      if (!finalMimeType || (!isAllowedMime && !isAllowedExtension)) {
        return NextResponse.json(
          { success: false, error: 'Invalid cover image type' },
          { status: 400 },
        );
      }

      if (coverImageFile.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: 'Cover image is too large' },
          { status: 400 },
        );
      }

      const isHeic = Boolean(finalMimeType && HEIC_MIME_TYPES.has(finalMimeType));
      const safeExtension = sanitizeExtension(
        isHeic ? '.jpg' : resolveFileExtension(coverImageFile.name, finalMimeType),
      );

      if (!safeExtension) {
        return NextResponse.json(
          { success: false, error: 'Invalid cover image extension' },
          { status: 400 },
        );
      }

      coverImagePath = buildAlbumCoverRelativePath(albumId, safeExtension);
      coverAbsolutePath = resolveUploadPath(coverImagePath);

      await mkdir(path.dirname(coverAbsolutePath), { recursive: true });

      if (isHeic) {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), 'cover-'));
        const inputExtension = sanitizeExtension(
          resolveFileExtension(coverImageFile.name, finalMimeType),
        );
        const tempInput = path.join(tempDir, `input${inputExtension || '.heic'}`);

        try {
          const nodeStream = Readable.fromWeb(coverImageFile.stream());
          await pipeline(nodeStream, createWriteStream(tempInput));
          await convertHeicToJpeg(tempInput, coverAbsolutePath);
        } catch (error) {
          await unlink(coverAbsolutePath).catch(() => undefined);
          throw error;
        } finally {
          await rm(tempDir, { recursive: true, force: true });
        }
      } else {
        const nodeStream = Readable.fromWeb(coverImageFile.stream());
        await pipeline(nodeStream, createWriteStream(coverAbsolutePath));
      }
    }

    const infoTextValue = typeof infoText === 'string' ? infoText : null;

    let updatedAlbum = null;

    try {
      updatedAlbum = await prisma.$transaction(async (tx) => {
        const album = await tx.album.update({
          where: { id: albumId },
          data: {
            name,
            infoText: infoTextValue,
            category,
            coverImage: coverImagePath,
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
            locationName: locationName || null,
          },
        });

        await createNotificationsForOtherUsers(tx, {
          actorUserId: session.user.id,
          type: NOTIFICATION_TYPES.ALBUM_UPDATED,
          message: `${album.name} blev opdateret`,
          albumId: album.id,
        });

        return album;
      });
    } catch (updateError) {
      if (
        coverAbsolutePath &&
        coverImagePath &&
        coverImagePath !== existingAlbum.coverImage
      ) {
        await unlink(coverAbsolutePath).catch(() => undefined);
      }
      throw updateError;
    }

    if (
      coverAbsolutePath &&
      existingAlbum.coverImage &&
      existingAlbum.coverImage !== coverImagePath
    ) {
      try {
        const previousPath = resolveUploadPath(existingAlbum.coverImage);
        await unlink(previousPath).catch(() => undefined);
      } catch (cleanupError) {
        console.error('Failed to remove previous cover:', cleanupError);
      }
    }

    return NextResponse.json(updatedAlbum);
  } catch (error) {
    console.error('Failed to update album:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update album' },
      { status: 500 },
    );
  }
}
