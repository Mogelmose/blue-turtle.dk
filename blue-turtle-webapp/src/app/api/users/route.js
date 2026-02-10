import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { sessionAuthOptions as authOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const onlineWindowMs = 2 * 60 * 1000;
    const now = Date.now();
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, lastSeenAt: true },
    });
    const normalized = users.map((user) => ({
      id: user.id,
      username: user.username,
      role: user.role,
      lastSeenAt: user.lastSeenAt,
      isOnline:
        user.lastSeenAt instanceof Date &&
        now - user.lastSeenAt.getTime() <= onlineWindowMs,
    }));
    return NextResponse.json(normalized);
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Error fetching users:`, error);
    return NextResponse.json(
      { message: "Internal server error", errorId },
      { status: 500 },
    );
  }
}
