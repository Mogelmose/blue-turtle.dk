import { NextResponse } from 'next/server';
import { writeFile, access, mkdir } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');

    const allowedFileTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ];

    if (!file || !allowedFileTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Invalid file type.' }, { status: 400 });
    }
    const albumId = data.get('albumId');

    if (!albumId) {
      return NextResponse.json({ success: false, error: 'AlbumId missing' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename
    const filename = `${Date.now()}-${file.name}`;
    const uploadDir = path.join(process.cwd(), 'media_uploads');

    // Ensure the upload directory exists
    try {
      await access(uploadDir);
    } catch {
      await mkdir(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);

    // Save the file
    await writeFile(filepath, buffer);

    // Save to database
    const newMedia = await prisma.media.create({
      data: {
        url: `/api/media/${filename}`,
        albumId: albumId,
      },
    });

    return NextResponse.json({ success: true, media: { ...newMedia } });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}
