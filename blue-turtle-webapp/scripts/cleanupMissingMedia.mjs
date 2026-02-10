import path from 'path';
import { access } from 'fs/promises';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getUploadRoot() {
  return process.env.UPLOAD_ROOT?.trim() || '/uploads';
}

function resolveUploadPath(relativePath) {
  const root = path.resolve(getUploadRoot());
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Resolved path is outside of UPLOAD_ROOT.');
  }
  return resolved;
}

async function main() {
  const media = await prisma.media.findMany({
    select: { id: true, storagePath: true },
  });

  const toDelete = [];
  for (const item of media) {
    if (!item.storagePath) {
      toDelete.push(item.id);
      continue;
    }

    try {
      const absolutePath = resolveUploadPath(item.storagePath);
      await access(absolutePath);
    } catch {
      toDelete.push(item.id);
    }
  }

  if (toDelete.length === 0) {
    console.log('No media rows to delete.');
    return;
  }

  const result = await prisma.media.deleteMany({
    where: { id: { in: toDelete } },
  });

  console.log(`Deleted ${result.count} media rows.`);
}

main()
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
