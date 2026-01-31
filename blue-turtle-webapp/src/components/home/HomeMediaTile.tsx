'use client';

import { useEffect, useState } from 'react';
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
const FALLBACK_VIDEO_POSTER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">' +
      '<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1">' +
      '<stop offset="0" stop-color="#e0f2fe"/><stop offset="1" stop-color="#bae6fd"/>' +
      '</linearGradient></defs>' +
      '<rect width="800" height="800" fill="url(#g)"/>' +
      '<circle cx="400" cy="400" r="170" fill="rgba(15,23,42,0.15)"/>' +
      '<path d="M360 320 L520 400 L360 480 Z" fill="rgba(15,23,42,0.6)"/>' +
      '</svg>',
  );

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
  const [posterSrc, setPosterSrc] = useState(FALLBACK_VIDEO_POSTER);
  const previewUrl = `/api/media/${item.id}/preview`;

  useEffect(() => {
    if (kind !== 'video') {
      return;
    }
    let isActive = true;
    const probe = new window.Image();
    probe.onload = () => {
      if (isActive) {
        setPosterSrc(previewUrl);
      }
    };
    probe.onerror = () => {
      if (isActive) {
        setPosterSrc(FALLBACK_VIDEO_POSTER);
      }
    };
    probe.src = previewUrl;
    return () => {
      isActive = false;
    };
  }, [kind, previewUrl]);

  return (
    <Link
      href={`/albums/${item.albumId}`}
      className="group relative block w-50 shrink-0 overflow-hidden rounded-xl border-2 border-default bg-surface-elevated transition-all duration-200 hover:translate-y-0.5 hover:border-default-hover hover:bg-surface-elevated hover:shadow-lg sm:w-auto sm:shrink"
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
            preload="auto"
            muted
            playsInline
            poster={posterSrc}
            onLoadedData={(event) => {
              try {
                event.currentTarget.currentTime = 0.1;
              } catch {
                // Best-effort thumbnail seek.
              }
            }}
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
