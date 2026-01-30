import { createReadStream, createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import sharp from 'sharp';
import prisma from '../lib/prisma.js';

function getUploadRoot() {
  const configured = process.env.DEV_UPLOAD_ROOT?.trim();
  return configured || '/uploads';
}

function resolveUploadPath(relativePath) {
  const root = path.resolve(getUploadRoot());
  const resolvedPath = path.resolve(root, relativePath);

  if (resolvedPath !== root && !resolvedPath.startsWith(`${root}${path.sep}`)) {
    throw new Error('Resolved path is outside of DEV_UPLOAD_ROOT.');
  }

  return resolvedPath;
}

function sanitizeExtension(extension) {
  const trimmed = extension.trim().toLowerCase();
  if (!trimmed) {
    return '';
  }

  const cleaned = trimmed.replace(/[^a-z0-9.]+/g, '');
  if (!cleaned) {
    return '';
  }

  return cleaned.startsWith('.') ? cleaned : `.${cleaned}`;
}

function buildConvertedRelativePath(albumId, mediaId, extension = '.jpg') {
  const safeExtension = sanitizeExtension(extension) || '.jpg';
  return path.posix.join('albums', albumId, 'converted', `${mediaId}${safeExtension}`);
}

const POLL_INTERVAL_MS = 4000;
const MAX_ATTEMPTS = 3;
const CONCURRENCY = 2;

let activeCount = 0;
let isShuttingDown = false;

async function claimJob() {
  const result = await prisma.$queryRaw`
    UPDATE "Job"
    SET status = 'PROCESSING',
        attempts = attempts + 1,
        "updatedAt" = NOW()
    WHERE id = (
      SELECT id
      FROM "Job"
      WHERE status = 'PENDING'
        AND type = 'CONVERT_HEIC'
        AND attempts < ${MAX_ATTEMPTS}
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id, payload, attempts;
  `;

  if (!Array.isArray(result) || result.length === 0) {
    return null;
  }

  return result[0];
}

async function markJobDone(jobId) {
  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'DONE' },
  });
}

async function markJobFailed(jobId, errorMessage, attempts) {
  const shouldRetry = attempts < MAX_ATTEMPTS;
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: shouldRetry ? 'PENDING' : 'FAILED',
      lastError: errorMessage,
    },
  });
}

async function handleConvertHeic(job) {
  const payload = job.payload ?? {};
  const mediaId = payload.mediaId;

  if (!mediaId || typeof mediaId !== 'string') {
    throw new Error('Missing mediaId in job payload.');
  }

  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: {
      id: true,
      albumId: true,
      storagePath: true,
      convertedPath: true,
      filename: true,
    },
  });

  if (!media?.storagePath || !media.albumId) {
    throw new Error('Media record missing storagePath or albumId.');
  }

  const originalAbsolute = resolveUploadPath(media.storagePath);
  const relativeConvertedPath =
    media.convertedPath ?? buildConvertedRelativePath(media.albumId, media.id, '.jpg');
  const convertedAbsolute = resolveUploadPath(relativeConvertedPath);

  await mkdir(path.dirname(convertedAbsolute), { recursive: true });

  await pipeline(
    createReadStream(originalAbsolute),
    sharp().rotate().jpeg({ quality: 82 }),
    createWriteStream(convertedAbsolute),
  );

  if (!media.convertedPath) {
    await prisma.media.update({
      where: { id: media.id },
      data: { convertedPath: relativeConvertedPath },
    });
  }
}

async function processJob(job) {
  try {
    await handleConvertHeic(job);
    await markJobDone(job.id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown job error';
    await markJobFailed(job.id, message, job.attempts ?? 0);
    console.error('Job failed:', job.id, message);
  }
}

async function runOnce() {
  while (!isShuttingDown && activeCount < CONCURRENCY) {
    const job = await claimJob();
    if (!job) {
      break;
    }

    activeCount += 1;
    void processJob(job).finally(() => {
      activeCount -= 1;
    });
  }
}

async function start() {
  console.log('Worker started: CONVERT_HEIC');
  await runOnce();
  const interval = setInterval(() => {
    if (isShuttingDown) {
      clearInterval(interval);
      return;
    }
    void runOnce();
  }, POLL_INTERVAL_MS);
}

function shutdown() {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.log('Worker shutting down...');
  setTimeout(() => process.exit(0), POLL_INTERVAL_MS);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

void start();
