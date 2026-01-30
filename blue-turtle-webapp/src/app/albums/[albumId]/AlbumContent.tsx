'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import type { Album, Category } from '@prisma/client';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/layout/BottomNav';
import Container from '@/components/layout/Container';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import EditAlbumModal from '@/components/album/EditAlbumModal';

type AlbumMedia = {
  id: string;
  url: string;
  mimeType?: string | null;
  filename?: string | null;
  originalName?: string | null;
  alt?: string | null;
};

type AlbumData = Album & {
  media: AlbumMedia[];
};

type PreparedMedia = AlbumMedia & {
  kind: 'image' | 'video' | 'unknown';
  displayUrl: string;
};

type Props = {
  initialAlbum: AlbumData;
};

const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.heic',
  '.heif',
];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov'];
const SWIPE_THRESHOLD = 50;
const CATEGORY_LABELS: Record<Category, string> = {
  REJSER: 'Rejser',
  SPILLEAFTEN: 'Spilleaftener',
  JULEFROKOST: 'Julefrokoster',
};
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

function normalizeMedia(item: AlbumMedia): PreparedMedia {
  const reference = (item.filename || item.url || '').toLowerCase();
  const mimeType = item.mimeType?.toLowerCase() ?? '';
  const isImage = mimeType
    ? mimeType.startsWith('image/')
    : IMAGE_EXTENSIONS.some((ext) => reference.endsWith(ext));
  const isVideo = mimeType
    ? mimeType.startsWith('video/')
    : VIDEO_EXTENSIONS.some((ext) => reference.endsWith(ext));
  const kind: PreparedMedia['kind'] = isVideo ? 'video' : isImage ? 'image' : 'unknown';
  const isHeic =
    isImage &&
    (mimeType === 'image/heic' ||
      mimeType === 'image/heif' ||
      reference.endsWith('.heic') ||
      reference.endsWith('.heif'));
  const displayUrl = isHeic
    ? `${item.url}${item.url.includes('?') ? '&' : '?'}format=jpeg`
    : item.url;

  return { ...item, kind, displayUrl };
}

export default function AlbumContent({ initialAlbum }: Props) {
  const [album, setAlbum] = useState<AlbumData>(initialAlbum);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';

  const preparedMedia = useMemo(
    () => (album?.media ?? []).map((item) => normalizeMedia(item)),
    [album],
  );
  const activeItem = activeIndex !== null ? preparedMedia[activeIndex] : null;

  const handleAlbumUpdated = (updatedAlbum: Album) => {
    setAlbum((prev) => ({ ...prev, ...updatedAlbum }));
  };

  useEffect(() => {
    setAlbum(initialAlbum);
  }, [initialAlbum]);

  useEffect(() => {
    const handleAlbumRefresh = (event: Event) => {
      const customEvent = event as CustomEvent<{ albumId?: string }>;
      if (!customEvent.detail?.albumId) {
        return;
      }
      if (customEvent.detail.albumId === album.id) {
        router.refresh();
      }
    };
    window.addEventListener('album-media-updated', handleAlbumRefresh);
    return () => window.removeEventListener('album-media-updated', handleAlbumRefresh);
  }, [album.id, router]);

  const closeViewer = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null || preparedMedia.length === 0) {
        return current;
      }
      return current + 1 >= preparedMedia.length ? 0 : current + 1;
    });
  }, [preparedMedia.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null || preparedMedia.length === 0) {
        return current;
      }
      return current - 1 < 0 ? preparedMedia.length - 1 : current - 1;
    });
  }, [preparedMedia.length]);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeViewer();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, closeViewer, goNext, goPrev]);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [activeIndex]);

  useEffect(() => {
    if (activeIndex !== null && activeIndex >= preparedMedia.length) {
      setActiveIndex(null);
    }
  }, [activeIndex, preparedMedia.length]);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart.current) {
      return;
    }
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX < 0) {
        goNext();
      } else {
        goPrev();
      }
    }
    touchStart.current = null;
  };

  if (!album) {
    return <div>Album not found or failed to load.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="flex-1">
        <Container className="w-full py-6 pb-24 md:pb-6">
          <section className="card card-gradient mb-2 md:mb-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                  {CATEGORY_LABELS[album.category]}
                </p>
                <h1 className="mt-2 text-3xl font-bold text-main sm:text-4xl">
                  {album.name}
                </h1>
                {album.infoText ? (
                  <p className="mt-2 text-sm text-muted">{album.infoText}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-default bg-surface-elevated px-3 py-1 text-xs font-semibold text-main">
                  {preparedMedia.length} medier
                </span>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="btn btn-secondary btn-sm"
                  >
                    Rediger album
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="mt-6">
            {preparedMedia.length === 0 ? (
              <div className="card text-center text-sm text-muted">
                Der er ingen medier i dette album endnu.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 sm:gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {preparedMedia.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className="group relative aspect-square overflow-hidden rounded-md border border-default bg-surface shadow-sm"
                    aria-label={
                      item.kind === 'video'
                        ? 'Åbn video'
                        : item.kind === 'image'
                          ? 'Åbn billede'
                          : 'Åbn medie'
                    }
                  >
                    {item.kind === 'image' ? (
                      <Image
                        src={item.displayUrl}
                        alt={item.alt || album.name}
                        fill
                        sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 18vw, (min-width: 768px) 22vw, 33vw"
                        unoptimized
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : item.kind === 'video' ? (
                      <video
                        src={item.displayUrl}
                        preload="metadata"
                        muted
                        playsInline
                        poster={FALLBACK_VIDEO_POSTER}
                        className="pointer-events-none h-full w-full object-cover"
                        onLoadedMetadata={(event) => {
                          try {
                            event.currentTarget.currentTime = 0.1;
                          } catch {
                            // Best-effort thumbnail seek.
                          }
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                        Ukendt filtype
                      </div>
                    )}
                    {item.kind === 'video' ? (
                      <>
                        <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                          <Play size={12} /> Video
                        </span>
                      </>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </section>
        </Container>
      </main>
      <Footer />
      <BottomNav />

      {activeItem ? (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 text-white"
          role="dialog"
          aria-modal="true"
          aria-label="Media viewer"
          onClick={closeViewer}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="absolute inset-x-0 top-4 z-10 flex items-center justify-between px-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              {activeIndex !== null ? `${activeIndex + 1} / ${preparedMedia.length}` : null}
            </div>
            <button
              type="button"
              onClick={closeViewer}
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide transition hover:bg-white/20"
              aria-label="Luk"
            >
              <X size={16} /> Luk
            </button>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goPrev();
            }}
            className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/20 bg-white/10 p-3 transition hover:bg-white/20 md:flex"
            aria-label="Forrige"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goNext();
            }}
            className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/20 bg-white/10 p-3 transition hover:bg-white/20 md:flex"
            aria-label="Næste"
          >
            <ChevronRight size={20} />
          </button>

          <div
            className="relative mx-auto flex max-h-[82vh] w-full max-w-6xl items-center justify-center px-4"
            onClick={(event) => event.stopPropagation()}
          >
            {activeItem.kind === 'video' ? (
              <video
                src={activeItem.displayUrl}
                controls
                autoPlay
                muted
                playsInline
                className="max-h-[82vh] w-auto max-w-[92vw] rounded-xl shadow-2xl"
              />
            ) : activeItem.kind === 'image' ? (
              <div className="relative h-[82vh] w-full max-w-[92vw]">
                <Image
                  src={activeItem.displayUrl}
                  alt={activeItem.alt || album.name}
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-white/20 bg-white/10 px-6 py-4 text-sm">
                Ukendt filtype.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {typeof window !== 'undefined' &&
        isEditModalOpen &&
        ReactDOM.createPortal(
          <EditAlbumModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            album={album}
            onAlbumUpdated={handleAlbumUpdated}
          />,
          document.body,
        )}
    </div>
  );
}
