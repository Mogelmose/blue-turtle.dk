import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseTake(input: string | null) {
  const value = Number.parseInt(input ?? '20', 10);
  if (Number.isNaN(value) || value <= 0) {
    return 20;
  }
  return Math.min(value, 100);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const take = parseTake(searchParams.get('take'));

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    }),
    prisma.notification.count({
      where: { userId: session.user.id, readAt: null },
    }),
  ]);

  return NextResponse.json({
    items,
    unreadCount,
    lastCheckedAt: new Date().toISOString(),
  });
}

export async function PATCH() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: now },
  });

  return NextResponse.json({ success: true, readAt: now.toISOString() });
}
