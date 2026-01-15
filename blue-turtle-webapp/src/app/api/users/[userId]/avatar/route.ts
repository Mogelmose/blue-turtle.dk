import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import mime from 'mime-types';
import path from 'path';
import { Readable } from 'stream';
import prisma from '@/lib/prisma';
import { resolveUploadPath } from '@/lib/storage';

export const runtime = 'nodejs';

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
