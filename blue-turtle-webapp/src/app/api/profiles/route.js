import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FALLBACK_PROFILE_IMAGE = '/static/logo.png';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, image: true },
    });

    const profiles = users.map((user) => ({
      id: user.id,
      name: user.username,
      img: user.image ? `/api/users/${user.id}/avatar` : FALLBACK_PROFILE_IMAGE,
    }));
    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Failed to fetch profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
      { status: 500 },
    );
  }
}
