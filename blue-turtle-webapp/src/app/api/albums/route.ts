import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { getServerSession } from 'next-auth';
import type { Category } from '@prisma/client';
import prisma from '@/lib/prisma';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
import {
  createNotificationsForOtherUsers,
  NOTIFICATION_TYPES,
} from '@/lib/notifications';
import {
  AlbumCoverUploadValidationError,
  saveAlbumCoverFile,
} from '@/lib/albumCoverUpload';

export const runtime = 'nodejs';

const ALLOWED_CATEGORIES: Category[] = ['SPILLEAFTEN', 'REJSER', 'JULEFROKOST'];

type AlbumsQuery = {
  page: number;
  limit: number;
  summary: boolean;
  skip: number;
};

function parseAlbumsQuery(request: Request): AlbumsQuery {
  const { searchParams } = new URL(request.url);
  const page = Number.parseInt(searchParams.get('page') || '1', 10);
  const limit = Number.parseInt(searchParams.get('limit') || '10', 10);
  const summary = searchParams.get('summary') === '1';
  const skip = (page - 1) * limit;

  return { page, limit, summary, skip };
}

function parseOptionalCoordinate(value: FormDataEntryValue | null): number | null {
  if (!value) {
    return null;
  }
  return Number.parseFloat(String(value));
}

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

async function generateUniqueAlbumId(albumName: string): Promise<string> {
  let baseId = albumName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');
  let id = baseId;
  let counter = 1;

  while (await prisma.album.findUnique({ where: { id } })) {
    id = `${baseId}-${counter}`;
    counter += 1;
  }

  return id;
}

export async function GET(request: Request) {
  const { page, limit, summary, skip } = parseAlbumsQuery(request);

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
            media: true,
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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
  }

  try {
    const actorName = session.user.name?.trim() || 'En bruger';
    const formData = await request.formData();
    const name = formData.get('name');
    const infoText = formData.get('infoText');
    const category = formData.get('category');
    const coverImageFile = formData.get('coverImage');
    const latitude = formData.get('latitude');
    const longitude = formData.get('longitude');
    const locationName = formData.get('locationName');

    if (
      typeof name !== 'string' ||
      typeof infoText !== 'string' ||
      typeof category !== 'string'
    ) {
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

    if (!ALLOWED_CATEGORIES.includes(category as Category)) {
      return NextResponse.json(
        { message: 'Invalid category' },
        { status: 400 },
      );
    }

    const albumId = await generateUniqueAlbumId(name);
    let coverImagePath: string | null = null;
    let coverAbsolutePath: string | null = null;

    if (coverImageFile instanceof File && coverImageFile.size > 0) {
      try {
        const uploadedCover = await saveAlbumCoverFile({
          albumId,
          file: coverImageFile,
        });
        coverImagePath = uploadedCover.coverImagePath;
        coverAbsolutePath = uploadedCover.coverAbsolutePath;
      } catch (error) {
        if (error instanceof AlbumCoverUploadValidationError) {
          return NextResponse.json(
            { message: error.message },
            { status: error.status },
          );
        }
        throw error;
      }
    }

    let newAlbum = null;

    try {
      newAlbum = await prisma.$transaction(async (tx) => {
        const createdAlbum = await tx.album.create({
          data: {
            id: albumId,
            name,
            infoText,
            category: category as Category,
            coverImage: coverImagePath,
            latitude: parseOptionalCoordinate(latitude),
            longitude: parseOptionalCoordinate(longitude),
            locationName: parseOptionalString(locationName),
          },
        });

        await createNotificationsForOtherUsers(tx, {
          actorUserId: session.user.id,
          type: NOTIFICATION_TYPES.ALBUM_CREATED,
          message: `${actorName} oprettede albummet "${createdAlbum.name}".`,
          albumId: createdAlbum.id,
        });

        return createdAlbum;
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
