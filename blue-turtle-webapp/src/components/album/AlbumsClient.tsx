'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import type { Category } from '@prisma/client';
import type { AlbumSummary } from '@/lib/types/homepage';
import { formatShortDate } from '@/lib/date';
import CreateAlbumButton from '@/components/album/CreateAlbumButton';

type AlbumWithCategory = AlbumSummary & {
  category: Category;
};

type AlbumWithCategorySerialized = Omit<AlbumWithCategory, 'createdAt'> & {
  createdAt: string | Date;
};

type Props = {
  albums: AlbumWithCategorySerialized[];
  isAuthenticated: boolean;
};

const CATEGORY_LABELS: Record<Category, string> = {
  REJSER: 'Rejser',
  SPILLEAFTEN: 'Spilleaftener',
  JULEFROKOST: 'Julefrokoster',
};

const CATEGORY_ORDER: Category[] = ['REJSER', 'SPILLEAFTEN', 'JULEFROKOST'];

export default function AlbumsClient({ albums, isAuthenticated }: Props) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const grouped = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        key: category,
        title: CATEGORY_LABELS[category],
        albums: albums.filter((album) => album.category === category),
      })),
    [albums],
  );

  const selectedCount = selectedIds.size;

  const toggleSelection = (albumId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(albumId)) {
        next.delete(albumId);
      } else {
        next.add(albumId);
      }
      return next;
    });
  };

  const handleStartDelete = () => {
    setError(null);
    setSelectedIds(new Set());
    setIsSelecting(true);
  };

  const handleCancelDelete = () => {
    setError(null);
    setSelectedIds(new Set());
    setIsSelecting(false);
  };

  const handleConfirmDelete = async () => {
    if (selectedCount === 0 || isDeleting) {
      return;
    }

    const selectedAlbums = albums.filter((album) => selectedIds.has(album.id));
    const albumsWithMedia = selectedAlbums.filter((album) => album.mediaCount > 1);

    const confirmed = window.confirm(
      `Vil du slette ${selectedCount} album${selectedCount === 1 ? '' : 's'}?`,
    );
    if (!confirmed) {
      return;
    }

    if (albumsWithMedia.length > 0) {
      const secondConfirmed = window.confirm(
        `${albumsWithMedia.length} af de valgte album indeholder stadig ${albumsWithMedia[0].mediaCount} medier. ` +
          'Sletning af albummet fjerner alle disse medier. Bekræft sletning igen.',
      );
      if (!secondConfirmed) {
        return;
      }
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/albums/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumIds: Array.from(selectedIds) }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Sletning fejlede.');
      }

      setSelectedIds(new Set());
      setIsSelecting(false);
      router.refresh();
    } catch (err) {
      console.error('Failed to delete albums:', err);
      setError('Noget gik galt ved sletning.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-10">
      <section className="card card-gradient mb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-main sm:text-4xl">
              Alle albums
            </h1>
            <p className="mt-2 text-sm text-muted">
              Se alle album, grupperet efter kategori.
            </p>
            {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-default bg-surface-elevated px-3 py-1 text-xs font-semibold text-main">
              {albums.length} {albums.length === 1 ? 'album' : 'albums'}
            </span>
            {isAuthenticated && !isSelecting ? (
              <button
                type="button"
                onClick={handleStartDelete}
                className="btn btn-danger btn-sm"
              >
                Slet album
              </button>
            ) : null}
            {isAuthenticated && isSelecting ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  className="btn btn-secondary btn-sm"
                  disabled={isDeleting}
                >
                  Annuller
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="btn btn-danger btn-sm"
                  disabled={selectedCount === 0 || isDeleting}
                >
                  Slet valgte ({selectedCount})
                </button>
              </>
            ) : null}
            <CreateAlbumButton />
          </div>
        </div>
      </section>

      {grouped.map((group) => (
        <section key={group.key} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-main">{group.title}</h2>
            <span className="text-sm text-muted">{group.albums.length} albums</span>
          </div>
          {group.albums.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {group.albums.map((album) => {
                const hasCover = Boolean(album.coverImage);
                const coverUrl = hasCover
                  ? `/api/albums/${album.id}/cover`
                  : '/static/logo.png';
                const imageClassName = hasCover
                  ? 'object-cover transition-transform duration-300 group-hover:scale-105'
                  : 'object-contain transition-transform duration-300';
                const createdAt = new Date(album.createdAt);
                const isSelected = selectedIds.has(album.id);
                const wrapperClass = `card group w-full overflow-hidden p-0 transition-all duration-200 hover:translate-y-0.5 hover:border-default-hover hover:bg-surface-elevated hover:shadow-lg ${
                  isSelecting && isSelected ? 'ring-2 ring-sky-400' : ''
                }`;

                const body = (
                  <>
                    <div className="relative aspect-square bg-surface-elevated md:m-1 rounded-lg overflow-hidden">
                      <Image
                        src={coverUrl}
                        alt={album.name}
                        fill
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px"
                        unoptimized
                        className={imageClassName}
                      />
                    </div>
                    <div className="px-1 pb-0 pt-2 sm:p-2">
                      <h3 className="font-semibold text-main">
                        {album.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted">
                        {album.mediaCount} medier | {formatShortDate(createdAt)}
                      </p>
                    </div>
                    {isSelecting ? (
                      <span
                        className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border ${
                          isSelected
                            ? 'border-sky-300 text-white bg-sky-400'
                            : 'border-white/70 bg-black/40 text-transparent'
                        }`}
                      >
                        <Check size={14} />
                      </span>
                    ) : null}
                  </>
                );

                if (isSelecting && isAuthenticated) {
                  return (
                    <button
                      key={album.id}
                      type="button"
                      onClick={() => toggleSelection(album.id)}
                      className={`${wrapperClass} relative text-left`}
                      aria-pressed={isSelected}
                    >
                      {body}
                    </button>
                  );
                }

                return (
                  <Link key={album.id} href={`/albums/${album.id}`} className={wrapperClass}>
                    {body}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="card text-center">
              <p className="text-muted">Ingen albums endnu.</p>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
