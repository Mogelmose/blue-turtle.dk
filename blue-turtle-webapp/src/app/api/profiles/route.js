import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const revalidate = 3600; // Revalidate every hour

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { username: true },
    });
    const profiles = users.map((user) => ({
      name: user.username,
      img: `/billeder/${user.username.toLowerCase()}.jpg`,
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