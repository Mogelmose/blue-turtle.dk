import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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