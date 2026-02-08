import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
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
} from '@/lib/storage';
import { convertHeicToJpeg } from '@/lib/heic';

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

// GET all albums
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const summary = searchParams.get('summary') === '1';
  const skip = (page - 1) * limit;

  try {
    const albums = summary
      ? await prisma.album.findMany({
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            category: true,
          },
        })
      : await prisma.album.findMany({
          skip,
          take: limit,
          include: {
            media: true, // Include media to show a cover image
          },
        });

    const total = await prisma.album.count();
    return NextResponse.json({
      albums,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching albums:', error);
    return NextResponse.json(
      { message: 'Error fetching albums' },
      { status: 500 },
    );
  }
}

// POST a new album
export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const name = formData.get('name');
    const infoText = formData.get('infoText');
    const category = formData.get('category');
    const coverImageFile = formData.get('coverImage');
    const latitude = formData.get('latitude');
    const longitude = formData.get('longitude');
    const locationName = formData.get('locationName');
    const allowedCategories = ['SPILLEAFTEN', 'REJSER', 'JULEFROKOST']; // Update based on your schema

    if (typeof name !== 'string' || typeof infoText !== 'string' || typeof category !== 'string') {
      return NextResponse.json(
        { message: 'Missing required text fields' },
        { status: 400 },
      );
    }

    if (!name || !infoText || !category) {
      return NextResponse.json(
        { message: 'Missing required text fields' },
        { status: 400 },
      );
    }

    if (!allowedCategories.includes(category)) {
      return NextResponse.json(
        { message: 'Invalid category' },
        { status: 400 },
      );
    }

    async function generateUniqueAlbumId(albumName) {
      let baseId = albumName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '');
      let id = baseId;
      let counter = 1;

      while (await prisma.album.findUnique({ where: { id } })) {
        id = `${baseId}-${counter}`;
        counter++;
      }

      return id;
    }

    const albumId = await generateUniqueAlbumId(name);
    let coverImagePath = null;
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
          { message: 'Invalid cover image type' },
          { status: 400 },
        );
      }

      if (coverImageFile.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { message: 'Cover image is too large' },
          { status: 400 },
        );
      }

      const isHeic = Boolean(finalMimeType && HEIC_MIME_TYPES.has(finalMimeType));
      const safeExtension = sanitizeExtension(
        isHeic ? '.jpg' : resolveFileExtension(coverImageFile.name, finalMimeType),
      );

      if (!safeExtension) {
        return NextResponse.json(
          { message: 'Invalid cover image extension' },
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

    let newAlbum = null;

    try {
      newAlbum = await prisma.album.create({
        data: {
          id: albumId,
          name,
          infoText,
          category,
          coverImage: coverImagePath,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          locationName: locationName || null,
        },
      });
    } catch (error) {
      if (coverAbsolutePath) {
        await unlink(coverAbsolutePath).catch(() => undefined);
      }
      throw error;
    }

    return NextResponse.json(newAlbum, { status: 201 });
  } catch (error) {
    console.error('Error creating album:', error);
    return NextResponse.json(
      { message: 'Error creating album' },
      { status: 500 },
    );
  }
}
