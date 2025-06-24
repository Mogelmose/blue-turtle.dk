import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const revalidate = 3600; // Revalidate every hour

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, image: true },
    });
    const profiles = users.map((user) => ({
      id: user.id,
      name: user.username,
      img: user.image || `/uploads/profile/${user.username.toLowerCase().replace(/[^a-z0-9]/g, '_')}.jpg`,
    }));
    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Failed to fetch profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}