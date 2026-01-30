import path from 'path';

export function getUploadRoot(): string {
  const configured = process.env.DEV_UPLOAD_ROOT?.trim();
  return configured || '/uploads';
}

export function resolveUploadPath(relativePath: string): string {
  const root = path.resolve(getUploadRoot());
  const resolvedPath = path.resolve(root, relativePath);

  if (resolvedPath !== root && !resolvedPath.startsWith(`${root}${path.sep}`)) {
    throw new Error('Resolved path is outside of DEV_UPLOAD_ROOT.');
  }

  return resolvedPath;
}

export function getMonthFolder(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function buildMediaRelativePath(
  albumId: string,
  monthFolder: string,
  filename: string,
): string {
  return path.posix.join('albums', albumId, 'original', monthFolder, filename);
}

export function buildConvertedRelativePath(
  albumId: string,
  mediaId: string,
  extension = '.jpg',
): string {
  const safeExtension = sanitizeExtension(extension) || '.jpg';
  return path.posix.join('albums', albumId, 'converted', `${mediaId}${safeExtension}`);
}

export function sanitizeFilename(name: string): string {
  const base = path.basename(name);
  const extension = path.extname(base);
  const rawBase = extension ? base.slice(0, -extension.length) : base;
  const normalizedExtension = extension.toLowerCase();
  const raw = rawBase;
  const normalized = raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const slug = normalized
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return `${slug || 'file'}${normalizedExtension}`;
}

export function sanitizeExtension(extension: string): string {
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

export function buildAlbumCoverRelativePath(
  albumId: string,
  extension: string,
): string {
  return path.posix.join('albums', albumId, 'cover', `${albumId}-cover${extension}`);
}

export function buildUserAvatarRelativePath(
  userId: string,
  extension: string,
): string {
  return path.posix.join('users', userId, 'avatar', `${userId}-avatar${extension}`);
}
