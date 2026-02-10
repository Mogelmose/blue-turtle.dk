import { NextResponse, type NextRequest } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { PassThrough, Readable } from 'stream';
import path from 'path';
import archiver from 'archiver';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
import { resolveUploadPath } from '@/lib/storage';

export const runtime = 'nodejs';

type DownloadRequestBody = {
  mediaIds?: unknown;
  albumId?: unknown;
};

function normalizeMediaIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const ids = value.filter((id): id is string => typeof id === 'string');
  return Array.from(new Set(ids));
}

function toSafeEntryName(name: string): string {
  const base = path.basename(name);
  const cleaned = base.replace(/[\\/:*?"<>|]+/g, '-').trim();
  return cleaned || 'media';
}

function makeUniqueName(name: string, used: Set<string>): string {
  const safe = toSafeEntryName(name);
  if (!used.has(safe)) {
    used.add(safe);
    return safe;
  }

  const ext = path.extname(safe);
  const stem = ext ? safe.slice(0, -ext.length) : safe;
  let counter = 2;
  while (used.has(`${stem}-${counter}${ext}`)) {
    counter += 1;
  }
  const unique = `${stem}-${counter}${ext}`;
  used.add(unique);
  return unique;
}

function buildZipFilename(albumName: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const normalized = albumName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const safeName = normalized || 'album';
  return `${safeName}-${yyyy}-${mm}-${dd}.zip`;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: DownloadRequestBody | null = null;
  try {
    body = (await request.json()) as DownloadRequestBody;
  } catch {
    body = null;
  }

  const mediaIds = normalizeMediaIds(body?.mediaIds);
  const albumId = typeof body?.albumId === 'string' ? body.albumId : null;
  if (!albumId || mediaIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid request.' },
      { status: 400 },
    );
  }

  try {
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      select: { name: true },
    });
    if (!album) {
      return NextResponse.json({ success: false, error: 'Album not found.' }, { status: 404 });
    }

    const media = await prisma.media.findMany({
      where: { id: { in: mediaIds }, albumId },
      select: {
        id: true,
        storagePath: true,
        filename: true,
        originalName: true,
      },
    });

    if (media.length === 0) {
      return NextResponse.json({ success: false, error: 'No media found.' }, { status: 404 });
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    const passThrough = new PassThrough();
    const usedNames = new Set<string>();

    archive.on('warning', (error) => {
      if (error.code !== 'ENOENT') {
        console.warn('Zip warning:', error);
      }
    });

    archive.on('error', (error) => {
      passThrough.destroy(error);
    });

    archive.pipe(passThrough);

    for (const item of media) {
      if (!item.storagePath) {
        continue;
      }
      try {
        const absolutePath = resolveUploadPath(item.storagePath);
        await stat(absolutePath);
        const entryName = makeUniqueName(
          item.originalName || item.filename || item.id,
          usedNames,
        );
        archive.append(createReadStream(absolutePath), { name: entryName });
      } catch (error) {
        console.warn('Skipping media in zip:', item.id, error);
      }
    }

    void archive.finalize();

    const filename = buildZipFilename(album.name);
    const stream = Readable.toWeb(passThrough) as unknown as ReadableStream<Uint8Array>;

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Bulk download failed:', error);
    return NextResponse.json(
      { success: false, error: 'Download failed.' },
      { status: 500 },
    );
  }
}
