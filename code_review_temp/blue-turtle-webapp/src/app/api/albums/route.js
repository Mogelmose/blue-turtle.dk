import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// GET all albums
export async function GET() {
  try {
    const albums = await prisma.album.findMany({
      include: {
        media: true, // Include media to show a cover image
      },
    });
    return NextResponse.json(albums);
  } catch (error) {
    console.error('Error fetching albums:', error);
    return NextResponse.json({ message: 'Error fetching albums' }, { status: 500 });
  }
}

// POST a new album
export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const name = formData.get('name');
    const infoText = formData.get('infoText');
    const category = formData.get('category');
    const coverImageFile = formData.get('coverImage');

    if (!name || !infoText || !category) {
      return NextResponse.json({ message: 'Missing required text fields' }, { status: 400 });
    }

    let coverImageUrl = null;

    if (coverImageFile && coverImageFile.size > 0) {
      const buffer = Buffer.from(await coverImageFile.arrayBuffer());
      const filename = `${Date.now()}-${coverImageFile.name.replace(/\s/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads/covers');
      const savePath = path.join(uploadDir, filename);

      await mkdir(uploadDir, { recursive: true });
      await writeFile(savePath, buffer);
      coverImageUrl = `/uploads/covers/${filename}`;
    }

    const newAlbum = await prisma.album.create({
      data: {
        id: name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''),
        name,
        infoText,
        category,
        coverImage: coverImageUrl,
      },
    });

    return NextResponse.json(newAlbum, { status: 201 });
  } catch (error) {
    console.error('Error creating album:', error);
    return NextResponse.json({ message: 'Error creating album' }, { status: 500 });
  }
}
