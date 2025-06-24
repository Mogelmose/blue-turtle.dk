import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import mime from 'mime-types';

export async function GET(request, { params }) {
  try {
        const { slug } = await params;

    // Add defensive checks for the slug parameter
    if (!slug || slug.length < 2) {
      return NextResponse.json({ error: 'Invalid file path. Expected /api/media/[albumId]/[filename].' }, { status: 400 });
    }

    const [albumId, filename] = slug;

    const filePath = path.join(process.cwd(), 'album_uploads', albumId, filename);

    // Read the file from the filesystem
    const fileBuffer = await readFile(filePath);

    // Determine the content type from the filename
    const contentType = mime.lookup(filename) || 'application/octet-stream';

    // Return the file with the correct headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });

  } catch (error) {
    // If the file doesn't exist (ENOENT), return a 404
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    console.error('Media stream error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
