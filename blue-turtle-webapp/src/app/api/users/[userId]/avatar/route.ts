import { NextResponse, type NextRequest } from 'next/server';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, mkdtemp, rm, stat, unlink } from 'fs/promises';
import mime from 'mime-types';
import path from 'path';
import os from 'os';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
import {
  buildUserAvatarRelativePath,
  resolveUploadPath,
  sanitizeExtension,
} from '@/lib/storage';
import { convertHeicToJpeg } from '@/lib/heic';

export const runtime = 'nodejs';

const ALLOWED_FILE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const HEIC_MIME_TYPES = new Set(['image/heic', 'image/heif']);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

function resolveMimeType(file: File): string | null {
  if (file.type) {
    return file.type.toLowerCase();
  }

  const lookup = mime.lookup(file.name);
  if (typeof lookup === 'string') {
    return lookup.toLowerCase();
  }

  const extension = path.extname(file.name).slice(1).toLowerCase();
  return EXTENSION_TO_MIME[extension] ?? null;
}

function isSafeUserId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value);
}

type AvatarContext =
  | {
      absolutePath: string;
      contentType: string;
      filename: string;
      size: number;
    }
  | { error: NextResponse };

async function getAvatarContext(userId: string): Promise<AvatarContext> {
  if (!userId) {
    return {
      error: NextResponse.json({ error: 'Invalid user ID.' }, { status: 400 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });

  if (!user?.image) {
    return {
      error: NextResponse.json({ error: 'Avatar not found.' }, { status: 404 }),
    };
  }

  let absolutePath = '';

  try {
    if (user.image.startsWith('/')) {
      const publicRoot = path.resolve(process.cwd(), 'public');
      const relative = user.image.replace(/^\/+/, '');
      const resolved = path.resolve(publicRoot, relative);

      if (resolved !== publicRoot && !resolved.startsWith(`${publicRoot}${path.sep}`)) {
        throw new Error('Avatar path escapes public root.');
      }

      absolutePath = resolved;
    } else {
      absolutePath = resolveUploadPath(user.image);
    }
  } catch (error) {
    console.error('Invalid avatar path:', error);
    return {
      error: NextResponse.json({ error: 'Avatar not found.' }, { status: 404 }),
    };
  }

  const fileStat = await stat(absolutePath);
  const lookup = mime.lookup(user.image);
  const contentType =
    typeof lookup === 'string' ? lookup : 'application/octet-stream';

  return {
    absolutePath,
    contentType,
    filename: path.basename(user.image),
    size: fileStat.size,
  };
}

type RouteContext = { params: Promise<{ userId: string }> };

export async function HEAD(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await params;
    const context = await getAvatarContext(userId);

    if ('error' in context) {
      return context.error;
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': context.contentType,
        'Content-Length': context.size.toString(),
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `inline; filename="${context.filename}"`,
      },
    });
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return NextResponse.json({ error: 'Avatar not found.' }, { status: 404 });
    }

    console.error('Avatar stream error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 },
    );
  }
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await params;
    const context = await getAvatarContext(userId);

    if ('error' in context) {
      return context.error;
    }

    const stream = createReadStream(context.absolutePath);
    const body = Readable.toWeb(stream) as unknown as ReadableStream;

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': context.contentType,
        'Content-Length': context.size.toString(),
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `inline; filename="${context.filename}"`,
      },
    });
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return NextResponse.json({ error: 'Avatar not found.' }, { status: 404 });
    }

    console.error('Avatar stream error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { userId } = await params;

  if (!isSafeUserId(userId)) {
    return NextResponse.json({ error: 'Invalid user ID.' }, { status: 400 });
  }

  if (session.user.id !== userId && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, image: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  try {
    const data = await request.formData();
    const fileRaw = data.get('file');

    if (!(fileRaw instanceof File)) {
      return NextResponse.json({ error: 'Mangler fil.' }, { status: 400 });
    }

    const file = fileRaw;
    let resolvedMimeType = resolveMimeType(file);
    const extensionFromName = path.extname(file.name).slice(1).toLowerCase();
    const extensionMimeType = EXTENSION_TO_MIME[extensionFromName];
    const isAllowedMime = resolvedMimeType && ALLOWED_FILE_TYPES.has(resolvedMimeType);
    const isAllowedExtension =
      extensionMimeType && ALLOWED_FILE_TYPES.has(extensionMimeType);

    if (!isAllowedMime && isAllowedExtension) {
      resolvedMimeType = extensionMimeType;
    }

    if (!resolvedMimeType || (!isAllowedMime && !isAllowedExtension)) {
      return NextResponse.json(
        { error: 'Ikke tilladt filtype.' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Filen er for stor.' },
        { status: 400 },
      );
    }

    const isHeic = HEIC_MIME_TYPES.has(resolvedMimeType);
    const extensionFromMime = mime.extension(resolvedMimeType);
    const extension = sanitizeExtension(
      isHeic
        ? '.jpg'
        : path.extname(file.name) ||
            (typeof extensionFromMime === 'string'
              ? `.${extensionFromMime}`
              : ''),
    );

    if (!extension) {
      return NextResponse.json(
        { error: 'Kunne ikke bestemme filtypen.' },
        { status: 400 },
      );
    }

    const relativePath = buildUserAvatarRelativePath(userId, extension);
    const absolutePath = resolveUploadPath(relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });

    if (isHeic) {
      const tempDir = await mkdtemp(path.join(os.tmpdir(), 'avatar-'));
      const inputExtension = sanitizeExtension(
        path.extname(file.name) ||
          (typeof extensionFromMime === 'string'
            ? `.${extensionFromMime}`
            : ''),
      );
      const tempInput = path.join(tempDir, `input${inputExtension || '.heic'}`);

      try {
        const nodeStream = Readable.fromWeb(
          file.stream() as unknown as import('stream/web').ReadableStream,
        );
        await pipeline(nodeStream, createWriteStream(tempInput));
        await convertHeicToJpeg(tempInput, absolutePath);
      } catch (error) {
        await unlink(absolutePath).catch(() => undefined);
        throw error;
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    } else {
      const nodeStream = Readable.fromWeb(
        file.stream() as unknown as import('stream/web').ReadableStream,
      );
      await pipeline(nodeStream, createWriteStream(absolutePath));
    }

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { image: relativePath },
      });
    } catch (error) {
      await unlink(absolutePath).catch(() => undefined);
      throw error;
    }

    if (user.image && !user.image.startsWith('/') && user.image !== relativePath) {
      try {
        await unlink(resolveUploadPath(user.image));
      } catch (error) {
        console.error('Failed to delete old avatar:', error);
      }
    }

    return NextResponse.json(
      { success: true, avatarUrl: `/api/users/${userId}/avatar` },
      { status: 201 },
    );
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { error: 'Upload fejlede.' },
      { status: 500 },
    );
  }
}
