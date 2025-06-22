import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request, context) {
  try {
    const { albumId } = await context.params;
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      include: { media: true },
    });

    if (!album) {
      return NextResponse.json({ success: false, error: 'Album not found' }, { status: 404 });
    }

    return NextResponse.json(album);
  } catch (error) {
    console.error('Failed to fetch album:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch album' }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 401 });
  }

  try {
    const { albumId } = context.params;
    const body = await request.json();
    const { name, infoText, category, coverImage } = body;

    if (!name || !category) {
      return NextResponse.json({ success: false, error: 'Name and category are required.' }, { status: 400 });
    }

    const updatedAlbum = await prisma.album.update({
      where: { id: albumId },
      data: {
        name,
        infoText,
        category,
        coverImage,
      },
    });

    return NextResponse.json(updatedAlbum);
  } catch (error) {
    console.error('Failed to update album:', error);
    return NextResponse.json({ success: false, error: 'Failed to update album' }, { status: 500 });
  }
}