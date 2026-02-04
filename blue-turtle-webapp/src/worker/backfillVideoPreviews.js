import prisma from '../lib/prisma.js';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v'];

function buildVideoOrFilters() {
  const extensionFilters = VIDEO_EXTENSIONS.flatMap((ext) => ([
    { filename: { endsWith: ext, mode: 'insensitive' } },
    { storagePath: { endsWith: ext, mode: 'insensitive' } },
  ]));

  return [
    { mimeType: { startsWith: 'video/' } },
    ...extensionFilters,
  ];
}

async function run() {
  const candidates = await prisma.media.findMany({
    where: {
      previewPath: null,
      OR: buildVideoOrFilters(),
    },
    select: { id: true },
  });

  if (candidates.length === 0) {
    console.log('No missing video previews found.');
    return;
  }

  await prisma.job.createMany({
    data: candidates.map((media) => ({
      type: 'GENERATE_VIDEO_PREVIEW',
      payload: { mediaId: media.id },
      status: 'PENDING',
    })),
  });

  console.log(`Queued video preview jobs: ${candidates.length}`);
}

run()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
