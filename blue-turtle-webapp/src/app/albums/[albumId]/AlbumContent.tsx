'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import ReactDOM from 'react-dom';
import Lightbox from 'react-spring-lightbox';
import { ArrowDownToLine, Check, ChevronLeft, ChevronRight, Play, Trash2, X } from 'lucide-react';
import type { Album, Category } from '@prisma/client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  const displayUrl =
    isHeic && !item.url.includes('format=') && !item.url.includes('sig=') && !item.url.includes('exp=')
      ? `${item.url}${item.url.includes('?') ? '&' : '?'}format=jpeg`
      : item.url;

  return { ...item, kind, displayUrl };
}

export default function AlbumContent({ initialAlbum }: Props) {
  const [album, setAlbum] = useState<AlbumData>(initialAlbum);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canEdit = Boolean(session?.user?.id);

  const preparedMedia = useMemo(
    () => (album?.media ?? []).map((item) => normalizeMedia(item)),
    [album],
  );
  const selectedCount = selectedIds.size;
  const selectedItems = useMemo(
    () => preparedMedia.filter((item) => selectedIds.has(item.id)),
    [preparedMedia, selectedIds],
  );
  const lightboxImages = useMemo(
    () =>
      preparedMedia.map((item) => ({
        src: item.kind === 'video' ? FALLBACK_VIDEO_POSTER : item.displayUrl,
        alt: item.alt || album.name,
        loading: 'eager' as const,
        className:
          'max-h-[70vh] max-w-[92vw] object-contain sm:max-h-[78vh] md:max-h-[82vh]',
      })),
    [preparedMedia, album.name],
  );
  const lightboxIndex = activeIndex ?? 0;

  const handleAlbumUpdated = (updatedAlbum: Album) => {
    setAlbum((prev) => ({ ...prev, ...updatedAlbum }));
  };

  useEffect(() => {
    setAlbum(initialAlbum);
  }, [initialAlbum]);
  useEffect(() => {
    const mediaId = searchParams?.get('media');
    if (!mediaId || activeIndex !== null) {
      return;
    }
    const index = preparedMedia.findIndex((item) => item.id === mediaId);
    if (index >= 0) {
      setActiveIndex(index);
    }
  }, [activeIndex, preparedMedia, searchParams]);


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
    if (searchParams?.has('media')) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('media');
      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  const toggleSelectionMode = useCallback(() => {
    setIsSelecting((current) => {
      const next = !current;
      if (!next) {
        setSelectedIds(new Set());
      } else {
        setActiveIndex(null);
      }
      return next;
    });
  }, []);

  const toggleMediaSelection = useCallback((mediaId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(mediaId)) {
        next.delete(mediaId);
      } else {
        next.add(mediaId);
      }
      return next;
    });
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedCount === 0) {
      return;
    }
    const confirmed = window.confirm(
      `Vil du slette ${selectedCount} medie${selectedCount === 1 ? '' : 'r'}?`,
    );
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch('/api/media/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaIds: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setSelectedIds(new Set());
      setIsSelecting(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete media:', error);
      alert('Noget gik galt ved sletning.');
    }
  }, [selectedCount, selectedIds, router]);

  const handleDownloadSelected = useCallback(() => {
    if (selectedCount === 0) {
      return;
    }

    if (selectedCount === 1) {
      const item = selectedItems[0];
      if (!item) {
        return;
      }
      const link = document.createElement('a');
      link.href = item.url;
      link.download = item.filename || item.originalName || 'media';
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rawName = `${album.name}-${yyyy}-${mm}-${dd}`;
    const normalized = rawName
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const zipName = `${normalized || 'album'}-${yyyy}-${mm}-${dd}.zip`;

    fetch('/api/media/bulk-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaIds: Array.from(selectedIds), albumId: album.id }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Download failed');
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = zipName;
        link.rel = 'noopener';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      })
      .catch((error) => {
        console.error('Failed to download zip:', error);
        alert('Noget gik galt ved download.');
      });
  }, [selectedCount, selectedItems, album.id, album.name, selectedIds]);

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
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xl font-semibold uppercase tracking-[0.3em] text-muted sm:text-2xl">
                  {CATEGORY_LABELS[album.category]}
                </p>
                <h1 className="mt-2 text-3xl font-bold text-main sm:text-4xl">
                  {album.name}
                </h1>
                {album.infoText ? (
                  <p className="mt-2 text-sm text-muted break-all">{album.infoText}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3 md:w-full md:flex-col md:items-end">
                <span className="rounded-full border border-default bg-surface-elevated px-3 py-1 text-xs font-semibold text-main">
                  {preparedMedia.length} medier
                </span>
                {canEdit ? (
                  <>
                    <button
                      type="button"
                      onClick={toggleSelectionMode}
                      className="btn btn-primary btn-sm"
                    >
                      {isSelecting ? 'Annuller' : 'Vælg'}
                    </button>
                    {isSelecting ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                          {selectedCount} valgt
                        </span>
                        <button
                          type="button"
                          onClick={handleDownloadSelected}
                          disabled={selectedCount === 0}
                          className="btn btn-primary btn-sm"
                          aria-label="Download valgte"
                        >
                          <ArrowDownToLine size={22} />
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteSelected}
                          disabled={selectedCount === 0}
                          className="btn btn-danger btn-sm"
                          aria-label="Slet valgte"
                        >
                          <Trash2 size={22} />
                        </button>
                      </div>
                    ) : null}
                    {!isSelecting ? (
                      <button
                        type="button"
                        onClick={() => setIsEditModalOpen(true)}
                        className="btn btn-primary btn-sm"
                      >
                        Rediger album
                      </button>
                    ) : null}
                  </>
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
                    onClick={() =>
                      isSelecting ? toggleMediaSelection(item.id) : setActiveIndex(index)
                    }
                    className={`group relative aspect-square overflow-hidden rounded-md border border-default bg-surface shadow-sm ${
                      selectedIds.has(item.id) ? 'ring-2 ring-sky-400' : ''
                    }`}
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
                    {isSelecting ? (
                      <span
                        className={`absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border sm:right-2 sm:top-2 ${
                          selectedIds.has(item.id)
                            ? 'border-sky-300 text-white bg-sky-400'
                            : 'border-white/70 bg-black/40 text-transparent'
                        }`}
                      >
                        <Check size={14} />
                      </span>
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
      <Lightbox
        isOpen={activeIndex !== null}
        onClose={closeViewer}
        images={lightboxImages}
        currentIndex={lightboxIndex}
        onPrev={goPrev}
        onNext={goNext}
        style={{ zIndex: 60, background: 'rgba(8, 15, 23, 0.86)' }}
        renderHeader={() => (
          <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+1rem)] z-10 flex items-center justify-between px-4 text-white md:top-[calc(env(safe-area-inset-top)+5.25rem)]">
            <button
              type="button"
              onClick={closeViewer}
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-wide transition hover:bg-white/20"
              aria-label="Luk"
            >
              <X size={16} /> Luk
            </button>
            <div className="pointer-events-auto text-xs font-semibold uppercase tracking-[0.3em] text-white/85">
              {activeIndex !== null ? `${activeIndex + 1} / ${preparedMedia.length}` : null}
            </div>
          </div>
        )}
        renderPrevButton={() => (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/30 bg-white/15 p-3 text-white transition hover:bg-white/20 md:flex"
            aria-label="Forrige"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        renderNextButton={() => (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/30 bg-white/15 p-3 text-white transition hover:bg-white/20 md:flex"
            aria-label="Næste"
          >
            <ChevronRight size={20} />
          </button>
        )}
        renderImageOverlay={() => {
          const current = preparedMedia[lightboxIndex];
          if (!current || current.kind !== 'video') {
            return null;
          }
          const previewUrl = `${current.url}/preview`;
          return (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center px-4"
              onClick={(event) => event.stopPropagation()}
            >
              <video
                src={current.displayUrl}
                controls
                preload="metadata"
                playsInline
                poster={previewUrl}
                className="max-h-[70vh] w-auto max-w-[92vw] rounded-xl shadow-2xl sm:max-h-[78vh] md:max-h-[82vh]"
              />
            </div>
          );
        }}
      />

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
