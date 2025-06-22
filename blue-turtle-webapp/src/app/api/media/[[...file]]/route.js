import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import mime from 'mime-types';

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Manually parse the file path from the URL to bypass a Next.js bug
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.pathname.replace('/api/media/', ''));
    const safeFilePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    const absolutePath = path.join(process.cwd(), 'media_uploads', safeFilePath);

    const stats = await fs.stat(absolutePath);
    const fileBuffer = await fs.readFile(absolutePath);

    const mimeType = mime.lookup(absolutePath) || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': stats.size,
      },
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return new NextResponse('File not found', { status: 404 });
    }
    console.error('File serving error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
