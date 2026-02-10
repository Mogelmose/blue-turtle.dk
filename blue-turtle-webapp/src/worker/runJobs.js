import { copyFile, mkdir, open, readFile, stat, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import exifr from 'exifr';
import ExifReader from 'exifreader';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { convertHeicToJpeg } from '../lib/heic.js';

function getUploadRoot() {
  const configured = process.env.UPLOAD_ROOT?.trim();
  return configured || '/uploads';
}

function resolveUploadPath(relativePath) {
  const root = path.resolve(getUploadRoot());
  const resolvedPath = path.resolve(root, relativePath);

  if (resolvedPath !== root && !resolvedPath.startsWith(`${root}${path.sep}`)) {
    throw new Error('Resolved path is outside of UPLOAD_ROOT.');
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
const CONCURRENCY = 6;
const JOB_TYPES = ['GENERATE_VIDEO_PREVIEW', 'CONVERT_HEIC', 'EXTRACT_METADATA'];
const WORKER_HEALTH_PATH =
  process.env.WORKER_HEALTH_FILE?.trim() || path.join(os.tmpdir(), 'blue-turtle-worker-health.json');

const IMAGE_MIME_PREFIX = 'image/';
const VIDEO_MIME_PREFIX = 'video/';
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);

let activeCount = 0;
let isShuttingDown = false;

async function writeWorkerHeartbeat(status = 'running') {
  const payload = {
    status,
    updatedAt: new Date().toISOString(),
    activeCount,
    isShuttingDown,
  };

  try {
    await writeFile(WORKER_HEALTH_PATH, JSON.stringify(payload), 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to write worker heartbeat:', message);
  }
}

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
        AND type = ${type}::"JobType"
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
    await convertHeicToJpeg(originalAbsolute, convertedAbsolute);
  }

  if (!media.convertedPath) {
    await prisma.media.update({
      where: { id: media.id },
      data: { convertedPath: relativeConvertedPath },
    });
  }
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

function runFfprobe(inputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      inputPath,
    ];
    const proc = spawn('ffprobe', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let errorOutput = '';

    proc.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    proc.stderr.on('data', (chunk) => {
      errorOutput += chunk.toString();
    });
    proc.on('error', (error) => {
      reject(new Error(`ffprobe failed to start: ${error.message}`));
    });
    proc.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(output));
        } catch (error) {
          reject(new Error('ffprobe output could not be parsed.'));
        }
      } else {
        reject(new Error(`ffprobe exited with code ${code}: ${errorOutput}`));
      }
    });
  });
}

function inferMediaKind(media) {
  const mimeType = media?.mimeType?.toLowerCase() ?? '';
  if (mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    return 'image';
  }
  if (mimeType.startsWith(VIDEO_MIME_PREFIX)) {
    return 'video';
  }

  const extension = path.extname(media?.filename ?? media?.storagePath ?? '').toLowerCase();
  if (IMAGE_EXTENSIONS.has(extension)) {
    return 'image';
  }
  if (VIDEO_EXTENSIONS.has(extension)) {
    return 'video';
  }
  return 'unknown';
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normalizeExifCoordinate(value) {
  const numeric = toNumber(value);
  if (numeric !== null) {
    return numeric;
  }

  if (Array.isArray(value) && value.length >= 2) {
    const [deg, min, sec] = value.map((part) => toNumber(part));
    if (deg === null || min === null) {
      return null;
    }
    const seconds = sec ?? 0;
    const sign = deg < 0 ? -1 : 1;
    const absDeg = Math.abs(deg);
    return sign * (absDeg + min / 60 + seconds / 3600);
  }

  return null;
}

function isValidCoordinate(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function normalizeCapturedAt(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string') {
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) {
      return direct;
    }
    const exifMatch = value.match(
      /^(\d{4}):(\d{2}):(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/,
    );
    if (exifMatch) {
      const [, year, month, day, hour = '0', minute = '0', second = '0'] = exifMatch;
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      );
    }
  }
  return null;
}

function parseIso6709(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const match = value.match(/([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }
  const lat = toNumber(match[1]);
  const lng = toNumber(match[2]);
  if (lat === null || lng === null) {
    return null;
  }
  return { lat, lng };
}

function parseLatLngPair(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }
  const lat = toNumber(match[1]);
  const lng = toNumber(match[2]);
  if (lat === null || lng === null) {
    return null;
  }
  return { lat, lng };
}

function extractVideoLocation(tags) {
  const candidates = [
    tags?.location,
    tags?.LOCATION,
    tags?.['com.apple.quicktime.location.ISO6709'],
    tags?.['com.apple.quicktime.location.iso6709'],
    tags?.['com.apple.quicktime.location'],
  ];

  for (const candidate of candidates) {
    const iso = parseIso6709(candidate);
    if (iso) {
      return iso;
    }
    const pair = parseLatLngPair(candidate);
    if (pair) {
      return pair;
    }
  }

  return null;
}

async function extractImageMetadata(absolutePath) {
  const parseFn = exifr?.parse ?? exifr?.default?.parse;
  if (typeof parseFn !== 'function') {
    throw new Error('exifr parse function is not available.');
  }

  const data = await parseFn(absolutePath, { gps: true });
  const latitude = normalizeExifCoordinate(
    data?.latitude ?? data?.lat ?? data?.GPSLatitude,
  );
  const longitude = normalizeExifCoordinate(
    data?.longitude ?? data?.lng ?? data?.lon ?? data?.GPSLongitude,
  );
  const capturedAt = normalizeCapturedAt(
    data?.DateTimeOriginal ?? data?.CreateDate ?? data?.ModifyDate ?? data?.DateTime,
  );

  return { latitude, longitude, capturedAt };
}

async function extractVideoMetadata(absolutePath) {
  const probe = await runFfprobe(absolutePath);
  const tags = {
    ...(probe?.format?.tags ?? {}),
  };
  for (const stream of probe?.streams ?? []) {
    if (stream?.tags) {
      Object.assign(tags, stream.tags);
    }
  }
  const location = extractVideoLocation(tags);
  const capturedAt = normalizeCapturedAt(
    tags?.creation_time ??
      tags?.['com.apple.quicktime.creationdate'] ??
      tags?.['com.apple.quicktime.creationDate'],
  );

  return {
    latitude: location?.lat ?? null,
    longitude: location?.lng ?? null,
    capturedAt,
  };
}

function isUnknownFormatError(error) {
  if (!error) {
    return false;
  }
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return (
    normalized.includes('unknown file format') ||
    normalized.includes('invalid image format') ||
    normalized.includes('unsupported format')
  );
}

function extractNumbersFromString(value) {
  if (typeof value !== 'string') {
    return [];
  }
  const matches = value.match(/-?\d+(?:\.\d+)?/g);
  return matches ? matches.map((entry) => Number(entry)).filter(Number.isFinite) : [];
}

function toExifReaderNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (Array.isArray(value) && value.length >= 2) {
    const numerator = toExifReaderNumber(value[0]);
    const denominator = toExifReaderNumber(value[1]);
    if (numerator === null || denominator === null || denominator === 0) {
      return null;
    }
    return numerator / denominator;
  }
  if (value && typeof value === 'object') {
    const numerator = toExifReaderNumber(value.numerator ?? value.num);
    const denominator = toExifReaderNumber(value.denominator ?? value.den);
    if (numerator !== null && denominator && denominator !== 0) {
      return numerator / denominator;
    }
    if (numerator !== null && denominator === null) {
      return numerator;
    }
  }
  return null;
}

function getExifReaderValue(tag) {
  if (!tag) {
    return null;
  }
  if (typeof tag.value !== 'undefined') {
    return tag.value;
  }
  if (typeof tag.description !== 'undefined') {
    return tag.description;
  }
  return null;
}

function normalizeExifReaderCoordinate(tag, refTag) {
  const raw = getExifReaderValue(tag);
  const ref = getExifReaderValue(refTag);
  let numeric = null;

  if (Array.isArray(raw)) {
    const parts = raw
      .map((part) => toExifReaderNumber(part))
      .filter((part) => part !== null);
    if (parts.length > 0) {
      numeric = normalizeExifCoordinate(parts);
    }
  } else {
    numeric = normalizeExifCoordinate(raw);
  }

  if (numeric === null && typeof tag?.description === 'string') {
    const parts = extractNumbersFromString(tag.description);
    if (parts.length > 0) {
      numeric = normalizeExifCoordinate(parts);
    }
  }

  if (numeric !== null && typeof ref === 'string') {
    const normalizedRef = ref.trim().toUpperCase();
    if (normalizedRef.startsWith('S') || normalizedRef.startsWith('W')) {
      numeric = -Math.abs(numeric);
    }
  }

  return numeric;
}

async function extractExifReaderMetadata(absolutePath) {
  const buffer = await readFile(absolutePath);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
  const tags = ExifReader.load(arrayBuffer);

  const latitude = normalizeExifReaderCoordinate(
    tags.GPSLatitude,
    tags.GPSLatitudeRef,
  );
  const longitude = normalizeExifReaderCoordinate(
    tags.GPSLongitude,
    tags.GPSLongitudeRef,
  );
  const capturedAt = normalizeCapturedAt(
    getExifReaderValue(tags.DateTimeOriginal) ??
      getExifReaderValue(tags.CreateDate) ??
      getExifReaderValue(tags.ModifyDate) ??
      getExifReaderValue(tags.DateTime),
  );

  return { latitude, longitude, capturedAt };
}

async function fileExists(absolutePath) {
  try {
    await stat(absolutePath);
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return false;
    }
    return false;
  }
}

async function extractImageMetadataWithFallback(media, originalAbsolutePath) {
  try {
    return await extractImageMetadata(originalAbsolutePath);
  } catch (error) {
    if (!isUnknownFormatError(error)) {
      throw error;
    }
  }

  try {
    return await extractExifReaderMetadata(originalAbsolutePath);
  } catch (error) {
    if (!isUnknownFormatError(error)) {
      throw error;
    }
  }

  if (!media?.convertedPath) {
    return null;
  }

  const convertedAbsolutePath = resolveUploadPath(media.convertedPath);
  if (!(await fileExists(convertedAbsolutePath))) {
    return null;
  }

  try {
    return await extractImageMetadata(convertedAbsolutePath);
  } catch (error) {
    if (!isUnknownFormatError(error)) {
      throw error;
    }
  }

  try {
    return await extractExifReaderMetadata(convertedAbsolutePath);
  } catch (error) {
    if (isUnknownFormatError(error)) {
      return null;
    }
    throw error;
  }
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

async function handleExtractMetadata(job) {
  const payload = job.payload ?? {};
  const mediaId = payload.mediaId;

  if (!mediaId || typeof mediaId !== 'string') {
    throw new Error('Missing mediaId in job payload.');
  }

  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: {
      id: true,
      storagePath: true,
      convertedPath: true,
      mimeType: true,
      filename: true,
    },
  });

  if (!media?.storagePath) {
    throw new Error('Media record missing storagePath.');
  }

  await prisma.media.update({
    where: { id: media.id },
    data: { metadataStatus: 'PROCESSING' },
  });

  const absolutePath = resolveUploadPath(media.storagePath);
  const kind = inferMediaKind(media);

  try {
    let latitude = null;
    let longitude = null;
    let capturedAt = null;
    let locationSource = 'NONE';

    if (kind === 'image') {
      const result = await extractImageMetadataWithFallback(media, absolutePath);
      if (!result) {
        await prisma.media.update({
          where: { id: media.id },
          data: {
            metadataStatus: 'DONE',
            capturedAt: null,
            locationAutoLat: null,
            locationAutoLng: null,
            locationSource: 'NONE',
          },
        });
        return;
      }
      latitude = result.latitude;
      longitude = result.longitude;
      capturedAt = result.capturedAt ?? null;
      if (isValidCoordinate(latitude, longitude)) {
        locationSource = 'EXIF';
      } else {
        latitude = null;
        longitude = null;
      }
    } else if (kind === 'video') {
      const result = await extractVideoMetadata(absolutePath);
      latitude = result.latitude;
      longitude = result.longitude;
      capturedAt = result.capturedAt ?? null;
      if (isValidCoordinate(latitude, longitude)) {
        locationSource = 'VIDEO_META';
      } else {
        latitude = null;
        longitude = null;
      }
    }

    await prisma.media.update({
      where: { id: media.id },
      data: {
        metadataStatus: 'DONE',
        capturedAt,
        locationAutoLat: latitude,
        locationAutoLng: longitude,
        locationSource,
      },
    });
  } catch (error) {
    await prisma.media.update({
      where: { id: media.id },
      data: { metadataStatus: 'FAILED' },
    });
    throw error;
  }
}

async function processJob(job) {
  try {
    if (job.type === 'EXTRACT_METADATA') {
      await handleExtractMetadata(job);
    } else if (job.type === 'CONVERT_HEIC') {
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
    void writeWorkerHeartbeat();
    void processJob(job).finally(() => {
      activeCount -= 1;
      void writeWorkerHeartbeat();
    });
  }
}

async function start() {
  console.log('Worker started: EXTRACT_METADATA, CONVERT_HEIC, GENERATE_VIDEO_PREVIEW');
  await writeWorkerHeartbeat('starting');
  await runOnce();
  await writeWorkerHeartbeat();
  const interval = setInterval(() => {
    if (isShuttingDown) {
      clearInterval(interval);
      return;
    }
    void runOnce().finally(() => {
      void writeWorkerHeartbeat();
    });
  }, POLL_INTERVAL_MS);
}

function shutdown() {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.log('Worker shutting down...');
  void writeWorkerHeartbeat('stopping');
  setTimeout(() => process.exit(0), POLL_INTERVAL_MS);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

void start();

