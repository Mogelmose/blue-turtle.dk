// src/app/api/users/route.js
import { PrismaClient } from '@prisma/client';

export async function GET() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true },
    });
    return Response.json(users);
  } finally {
    await prisma.$disconnect();
  }
}