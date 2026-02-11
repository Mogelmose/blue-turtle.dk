import { createWriteStream } from 'fs';
import { mkdir, mkdtemp, rm, unlink } from 'fs/promises';
import mime from 'mime-types';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import {
  buildAlbumCoverRelativePath,
  resolveUploadPath,
  sanitizeExtension,
} from '@/lib/storage';
import { convertHeicToJpeg } from '@/lib/heic';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const HEIC_MIME_TYPES = new Set(['image/heic', 'image/heif']);

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

type SaveAlbumCoverOptions = {
  albumId: string;
  file: File;
};

type SaveAlbumCoverResult = {
  coverImagePath: string;
  coverAbsolutePath: string;
};

type ValidationCode = 'INVALID_TYPE' | 'TOO_LARGE' | 'INVALID_EXTENSION';

const VALIDATION_MESSAGES: Record<ValidationCode, string> = {
  INVALID_TYPE: 'Invalid cover image type',
  TOO_LARGE: 'Cover image is too large',
  INVALID_EXTENSION: 'Invalid cover image extension',
};

export class AlbumCoverUploadValidationError extends Error {
  status: number;
  code: ValidationCode;

  constructor(code: ValidationCode, status = 400) {
    super(VALIDATION_MESSAGES[code]);
    this.name = 'AlbumCoverUploadValidationError';
    this.code = code;
    this.status = status;
  }
}

function resolveImageMimeType(file: File): string | null {
  if (file.type) {
    return file.type.toLowerCase();
  }

  const lookup = mime.lookup(file.name);
  if (typeof lookup === 'string') {
    return lookup.toLowerCase();
  }

  const extension = path.extname(file.name).slice(1).toLowerCase();
  return EXTENSION_TO_MIME[extension] ?? null;
}

function resolveFileExtension(fileName: string, mimeType: string | null): string {
  const fromName = path.extname(fileName);
  if (fromName) {
    return fromName;
  }

  if (!mimeType) {
    return '';
  }

  const fromMime = mime.extension(mimeType);
  return fromMime ? `.${fromMime}` : '';
}

export async function saveAlbumCoverFile({
  albumId,
  file,
}: SaveAlbumCoverOptions): Promise<SaveAlbumCoverResult> {
  const resolvedMimeType = resolveImageMimeType(file);
  const extension = path.extname(file.name).slice(1).toLowerCase();
  const extensionMimeType = EXTENSION_TO_MIME[extension];
  const isAllowedMime =
    resolvedMimeType && ALLOWED_IMAGE_MIME_TYPES.has(resolvedMimeType);
  const isAllowedExtension =
    extensionMimeType && ALLOWED_IMAGE_MIME_TYPES.has(extensionMimeType);

  const finalMimeType =
    !isAllowedMime && isAllowedExtension ? extensionMimeType : resolvedMimeType;

  if (!finalMimeType || (!isAllowedMime && !isAllowedExtension)) {
    throw new AlbumCoverUploadValidationError('INVALID_TYPE');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AlbumCoverUploadValidationError('TOO_LARGE');
  }

  const isHeic = HEIC_MIME_TYPES.has(finalMimeType);
  const safeExtension = sanitizeExtension(
    isHeic ? '.jpg' : resolveFileExtension(file.name, finalMimeType),
  );

  if (!safeExtension) {
    throw new AlbumCoverUploadValidationError('INVALID_EXTENSION');
  }

  const coverImagePath = buildAlbumCoverRelativePath(albumId, safeExtension);
  const coverAbsolutePath = resolveUploadPath(coverImagePath);
  await mkdir(path.dirname(coverAbsolutePath), { recursive: true });

  if (isHeic) {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'cover-'));
    const inputExtension = sanitizeExtension(
      resolveFileExtension(file.name, finalMimeType),
    );
    const tempInput = path.join(tempDir, `input${inputExtension || '.heic'}`);

    try {
      const nodeStream = Readable.fromWeb(file.stream());
      await pipeline(nodeStream, createWriteStream(tempInput));
      await convertHeicToJpeg(tempInput, coverAbsolutePath);
    } catch (error) {
      await unlink(coverAbsolutePath).catch(() => undefined);
      throw error;
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  } else {
    const nodeStream = Readable.fromWeb(file.stream());
    await pipeline(nodeStream, createWriteStream(coverAbsolutePath));
  }

  return { coverImagePath, coverAbsolutePath };
}
