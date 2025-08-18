import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { sessionAuthOptions as authOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true },
    });
    return NextResponse.json(users);
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Error fetching users:`, error);
    return NextResponse.json(
      { message: "Internal server error", errorId },
      { status: 500 },
    );
  }
}
