import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { getServerSession } from 'next-auth';
import type { Category } from '@prisma/client';
import prisma from '@/lib/prisma';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
import { resolveUploadPath } from '@/lib/storage';
import {
  createNotificationsForOtherUsers,
  NOTIFICATION_TYPES,
} from '@/lib/notifications';
import {
  AlbumCoverUploadValidationError,
  saveAlbumCoverFile,
} from '@/lib/albumCoverUpload';

export const runtime = 'nodejs';

const ALLOWED_CATEGORIES: Category[] = ['REJSER', 'SPILLEAFTEN', 'JULEFROKOST'];

type RouteContext = { params: Promise<{ albumId: string }> };
type JsonPatchPayload = {
  name?: unknown;
  infoText?: unknown;
  category?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  locationName?: unknown;
};

function parseOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function parseCoordinateFromUnknown(value: unknown): number | null {
  if (!value) {
    return null;
  }
  return Number.parseFloat(String(value));
}

export async function GET(_request: Request, { params }: RouteContext) {
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

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Not authorized' },
      { status: 401 },
    );
  }

  try {
    const actorName = session.user.name?.trim() || 'En bruger';
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
    let name: unknown = null;
    let infoText: unknown = null;
    let category: unknown = null;
    let coverImageFile: FormDataEntryValue | null = null;
    let latitude: unknown = null;
    let longitude: unknown = null;
    let locationName: unknown = null;

    if (contentType.includes('application/json')) {
      const body = (await request.json()) as JsonPatchPayload;
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
        { success: false, error: 'Navn og kategori er påkrævet' },
        { status: 400 },
      );
    }

    if (!name || !category) {
      return NextResponse.json(
        { success: false, error: 'Navn og kategori er påkrævet' },
        { status: 400 },
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Navn skal være under 50 tegn.' },
        { status: 400 },
      );
    }

    if (!ALLOWED_CATEGORIES.includes(category as Category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category.' },
        { status: 400 },
      );
    }

    let coverImagePath: string | null = existingAlbum.coverImage ?? null;
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
            { success: false, error: error.message },
            { status: error.status },
          );
        }
        throw error;
      }
    }

    const infoTextValue = parseOptionalString(infoText);
    const latitudeValue = parseCoordinateFromUnknown(latitude);
    const longitudeValue = parseCoordinateFromUnknown(longitude);
    const locationNameValue = parseOptionalString(locationName);

    let updatedAlbum = null;

    try {
      updatedAlbum = await prisma.$transaction(async (tx) => {
        const album = await tx.album.update({
          where: { id: albumId },
          data: {
            name,
            infoText: infoTextValue,
            category: category as Category,
            coverImage: coverImagePath,
            latitude: latitudeValue,
            longitude: longitudeValue,
            locationName: locationNameValue || null,
          },
        });

        await createNotificationsForOtherUsers(tx, {
          actorUserId: session.user.id,
          type: NOTIFICATION_TYPES.ALBUM_UPDATED,
          message: `${actorName} opdaterede albummet "${album.name}".`,
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
