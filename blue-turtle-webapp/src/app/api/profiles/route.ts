import { NextResponse } from 'next/server';
import { access } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';
import { resolveUploadPath } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FALLBACK_PROFILE_IMAGE = '/static/logo.png';

type ProfileItem = {
  id: string;
  name: string;
  img: string;
  isPlaceholder: boolean;
};

async function fileExists(absolutePath: string): Promise<boolean> {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

function resolvePublicPath(urlPath: string): string | null {
  const publicRoot = path.resolve(process.cwd(), 'public');
  const relative = urlPath.replace(/^\/+/, '');
  const resolved = path.resolve(publicRoot, relative);

  if (resolved !== publicRoot && !resolved.startsWith(`${publicRoot}${path.sep}`)) {
    return null;
  }

  return resolved;
}

async function resolveUserImagePath(imagePath: string | null): Promise<string | null> {
  if (!imagePath) {
    return null;
  }

  let normalized = imagePath.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith('/public/')) {
    normalized = normalized.replace(/^\/public/, '');
  } else if (normalized.startsWith('public/')) {
    normalized = `/${normalized.slice('public'.length)}`;
  }

  const candidates: Array<string | null> = [];

  if (normalized.startsWith('/')) {
    candidates.push(resolvePublicPath(normalized));
  } else {
    try {
      candidates.push(resolveUploadPath(normalized));
    } catch {
      // Ignore invalid upload path.
    }

    candidates.push(resolvePublicPath(`/${normalized}`));
  }

  for (const candidate of candidates) {
    if (candidate && (await fileExists(candidate))) {
      return candidate;
    }
  }

  return null;
}

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, image: true },
    });

    const profiles: ProfileItem[] = await Promise.all(
      users.map(async (user) => {
        const resolvedImage = await resolveUserImagePath(user.image);

        if (resolvedImage) {
          return {
            id: user.id,
            name: user.username,
            img: `/api/users/${user.id}/avatar`,
            isPlaceholder: false,
          };
        }

        return {
          id: user.id,
          name: user.username,
          img: FALLBACK_PROFILE_IMAGE,
          isPlaceholder: true,
        };
      }),
    );
    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Failed to fetch profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
      { status: 500 },
    );
  }
}
