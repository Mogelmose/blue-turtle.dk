import { NextResponse } from 'next/server';
import { writeFile, access, mkdir } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');
    const albumId = data.get('albumId');

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

    if (!allowedFileTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Invalid file type.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename to avoid overwrites
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const albumUploadDir = path.join(process.cwd(), 'album_uploads', albumId);

    // Ensure the album-specific upload directory exists
    try {
      await access(albumUploadDir);
    } catch {
      await mkdir(albumUploadDir, { recursive: true });
    }

    const filepath = path.join(albumUploadDir, filename);

    // Save the file
    await writeFile(filepath, buffer);

    // The URL must now point to a dedicated API endpoint to serve the file
    const mediaUrl = `/api/media/${albumId}/${filename}`;

    // Save to database
    const newMedia = await prisma.media.create({
      data: {
        url: mediaUrl,
        albumId: albumId,
      },
    });

    return NextResponse.json({ success: true, media: newMedia });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: 'Upload failed.' }, { status: 500 });
  }
}
