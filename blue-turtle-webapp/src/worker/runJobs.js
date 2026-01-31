import { copyFile, mkdir, open } from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
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

function buildPreviewRelativePath(albumId, mediaId, extension = '.jpg') {
  const safeExtension = sanitizeExtension(extension) || '.jpg';
  return path.posix.join(
    'albums',
    albumId,
    'derived',
    'previews',
    `${mediaId}-poster${safeExtension}`,
  );
}

const POLL_INTERVAL_MS = 4000;
const MAX_ATTEMPTS = 3;
const CONCURRENCY = 2;
const JOB_TYPES = ['CONVERT_HEIC', 'GENERATE_VIDEO_PREVIEW'];

let activeCount = 0;
let isShuttingDown = false;

async function claimJob(type) {
  const result = await prisma.$queryRaw`
    UPDATE "Job"
    SET status = 'PROCESSING',
        attempts = attempts + 1,
        "updatedAt" = NOW()
    WHERE id = (
      SELECT id
      FROM "Job"
      WHERE status = 'PENDING'
        AND type = ${type}
        AND attempts < ${MAX_ATTEMPTS}
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id, type, payload, attempts;
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

  if (await isJpegFile(originalAbsolute)) {
    await copyFile(originalAbsolute, convertedAbsolute);
  } else {
    await runHeifConvert(originalAbsolute, convertedAbsolute);
  }

  if (!media.convertedPath) {
    await prisma.media.update({
      where: { id: media.id },
      data: { convertedPath: relativeConvertedPath },
    });
  }
}

function runHeifConvert(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = ['-q', '90', inputPath, outputPath];
    const proc = spawn('heif-convert', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (error) => {
      const details = stderr.trim();
      reject(
        new Error(
          `heif-convert failed to start: ${error.message}${details ? ` (${details})` : ''}`,
        ),
      );
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        const details = stderr.trim();
        reject(
          new Error(
            `heif-convert exited with code ${code}${details ? ` (${details})` : ''}`,
          ),
        );
      }
    });
  });
}

async function isJpegFile(absolutePath) {
  const file = await open(absolutePath, 'r');
  try {
    const buffer = Buffer.alloc(3);
    await file.read(buffer, 0, 3, 0);
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  } finally {
    await file.close();
  }
}

function runFfmpeg(inputPath, outputPath, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-loglevel',
      'error',
      '-i',
      inputPath,
      ...extraArgs,
      outputPath,
    ];
    const proc = spawn('ffmpeg', args, { stdio: 'ignore' });

    proc.on('error', (error) => {
      reject(new Error(`ffmpeg failed to start: ${error.message}`));
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
}

async function handleGenerateVideoPreview(job) {
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
      previewPath: true,
    },
  });

  if (!media?.storagePath || !media.albumId) {
    throw new Error('Media record missing storagePath or albumId.');
  }

  const originalAbsolute = resolveUploadPath(media.storagePath);
  const relativePreviewPath =
    media.previewPath ?? buildPreviewRelativePath(media.albumId, media.id, '.jpg');
  const previewAbsolute = resolveUploadPath(relativePreviewPath);

  await mkdir(path.dirname(previewAbsolute), { recursive: true });
  await runFfmpeg(originalAbsolute, previewAbsolute, [
    '-ss',
    '0.5',
    '-frames:v',
    '1',
    '-q:v',
    '2',
    '-vf',
    'scale=960:-2',
  ]);

  if (!media.previewPath) {
    await prisma.media.update({
      where: { id: media.id },
      data: { previewPath: relativePreviewPath },
    });
  }
}

async function processJob(job) {
  try {
    if (job.type === 'CONVERT_HEIC') {
      await handleConvertHeic(job);
    } else if (job.type === 'GENERATE_VIDEO_PREVIEW') {
      await handleGenerateVideoPreview(job);
    } else {
      throw new Error(`Unsupported job type: ${job.type}`);
    }
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
    let job = null;
    for (const type of JOB_TYPES) {
      job = await claimJob(type);
      if (job) {
        break;
      }
    }
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
  console.log('Worker started: CONVERT_HEIC, GENERATE_VIDEO_PREVIEW');
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
