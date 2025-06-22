import { PrismaClient } from '@prisma/client';

// This is the recommended way to instantiate Prisma Client in a Next.js application.
// It ensures that only one instance of Prisma Client is created, preventing
// resource exhaustion from too many database connections.

const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

