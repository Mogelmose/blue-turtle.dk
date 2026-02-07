import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { sessionAuthOptions as authOptions } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastSeenAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Presence update failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update presence.' },
      { status: 500 },
    );
  }
}
