import Image from 'next/image';
import Link from 'next/link';
import type { MediaSummary } from '../../lib/types/homepage';

type Props = {
  item: MediaSummary;
};

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'm4v'];
const HEIC_EXTENSIONS = ['heic', 'heif'];
const HEIC_MIME_TYPES = new Set(['image/heic', 'image/heif']);

function getExtension(url: string): string | null {
  const cleanUrl = url.split('?')[0];
  const parts = cleanUrl.split('.');
  if (parts.length < 2) {
    return null;
  }
  return parts.pop()?.toLowerCase() ?? null;
}

function getMediaKind(
  url: string,
  mimeType?: string | null,
): 'image' | 'video' | 'unknown' {
  const normalizedMime = mimeType?.toLowerCase();
  if (normalizedMime?.startsWith('image/')) {
    return 'image';
  }
  if (normalizedMime?.startsWith('video/')) {
    return 'video';
  }

  const ext = getExtension(url);
  if (!ext) {
    return 'unknown';
  }
  if (IMAGE_EXTENSIONS.includes(ext)) {
    return 'image';
  }
  if (VIDEO_EXTENSIONS.includes(ext)) {
    return 'video';
  }
  return 'unknown';
}

function isHeic(url: string, mimeType?: string | null): boolean {
  const normalizedMime = mimeType?.toLowerCase();
  if (normalizedMime && HEIC_MIME_TYPES.has(normalizedMime)) {
    return true;
  }
  const ext = getExtension(url);
  return ext ? HEIC_EXTENSIONS.includes(ext) : false;
}

function getDisplayUrl(url: string, mimeType?: string | null): string {
  if (!isHeic(url, mimeType)) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}format=jpeg`;
}

export default function HomeMediaTile({ item }: Props) {
  const kind = getMediaKind(item.url, item.mimeType);
  const badgeLabel =
    kind === 'video' ? 'Video' : kind === 'image' ? 'Billede' : 'Fil';
  const displayUrl = getDisplayUrl(item.url, item.mimeType);

  return (
    <Link
      href={`/albums/${item.albumId}`}
      className="group relative block overflow-hidden rounded-xl border-2 border-default bg-surface-elevated transition-all duration-200 hover:translate-y-0.5 hover:border-default-hover hover:bg-surface-elevated hover:shadow-lg"
    >
      <div className="relative aspect-square">
        {kind === 'image' ? (
          <Image
            src={displayUrl}
            alt={item.albumName}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px"
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : kind === 'video' ? (
          <video
            className="h-full w-full object-cover"
            preload="metadata"
            muted
            playsInline
          >
            <source src={item.url} />
          </video>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted">
            Fil
          </div>
        )}
      </div>
      <span className="absolute left-1 top-1 rounded-full border-2 border-default bg-surface px-2 py-0.5 text-xs font-semibold text-main md:text-sm">
        {badgeLabel}
      </span>
      <span className="absolute inset-x-2 bottom-2 truncate text-xs font-semibold text-main md:text-lg">
        {item.albumName}
      </span>
    </Link>
  );
}
