'use client';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect, useRef, useState, useTransition } from 'react';
import { ChevronDown } from 'lucide-react';
import { Album, Category } from '@prisma/client';

const AlbumLocationPicker = dynamic(() => import('./AlbumLocationPicker'), {
  ssr: false,
});

interface EditAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  album: Album;
  onAlbumUpdated: (updatedAlbum: Album) => void;
}

const CATEGORY_LABELS: Record<Category, string> = {
  REJSER: 'Rejser',
  SPILLEAFTEN: 'Spilleaftener',
  JULEFROKOST: 'Julefrokoster',
};

const CATEGORY_ORDER: Category[] = [
  'REJSER',
  'SPILLEAFTEN',
  'JULEFROKOST',
];

export default function EditAlbumModal({ isOpen, onClose, album, onAlbumUpdated }: EditAlbumModalProps) {
  const [name, setName] = useState(album.name);
  const [infoText, setInfoText] = useState(album.infoText || '');
  const [category, setCategory] = useState(album.category);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    album.latitude !== null && album.longitude !== null
      ? { lat: album.latitude, lng: album.longitude }
      : null,
  );
  const [locationName, setLocationName] = useState(album.locationName || '');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const infoTextRef = useRef<HTMLTextAreaElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName(album.name);
    setInfoText(album.infoText || '');
    setCategory(album.category);
    setCoverFile(null);
    setCoverPreviewUrl(null);
    setLocation(
      album.latitude !== null && album.longitude !== null
        ? { lat: album.latitude, lng: album.longitude }
        : null,
    );
    setLocationName(album.locationName || '');
    setError(null);
  }, [
    album.category,
    album.infoText,
    album.latitude,
    album.locationName,
    album.longitude,
    album.name,
    isOpen,
  ]);

  useEffect(() => {
    if (!infoTextRef.current) {
      return;
    }
    infoTextRef.current.style.height = '0px';
    infoTextRef.current.style.height = `${infoTextRef.current.scrollHeight}px`;
  }, [infoText]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [coverFile]);

  useEffect(() => {
    if (!isOpen) {
      setIsCategoryOpen(false);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const scrollY = window.scrollY;
    const originalStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.position = originalStyles.position;
      document.body.style.top = originalStyles.top;
      document.body.style.left = originalStyles.left;
      document.body.style.right = originalStyles.right;
      document.body.style.width = originalStyles.width;
      document.body.style.overflow = originalStyles.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const useFormData = Boolean(coverFile);
        let response: Response;

        if (useFormData) {
          const formData = new FormData();
          formData.append('name', name);
          formData.append('infoText', infoText);
          formData.append('category', category);
          if (coverFile) {
            formData.append('coverImage', coverFile);
          }
          if (location) {
            formData.append('latitude', location.lat.toString());
            formData.append('longitude', location.lng.toString());
          }
          if (locationName) {
            formData.append('locationName', locationName);
          }

          response = await fetch(`/api/albums/${album.id}`, {
            method: 'PATCH',
            body: formData,
          });
        } else {
          response = await fetch(`/api/albums/${album.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              infoText,
              category,
              latitude: location?.lat ?? null,
              longitude: location?.lng ?? null,
              locationName: locationName || null,
            }),
          });
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Noget gik galt');
        }

        onAlbumUpdated(data);
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Noget gik galt');
      }
    });
  };

  const coverUrl = album.coverImage ? `/api/albums/${album.id}/cover` : null;
  const displayCoverUrl = coverPreviewUrl || coverUrl;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl overscroll-contain scrollbar-subtle scrollbar-gutter-stable"
        role="dialog"
        aria-modal="true"
        aria-label="Rediger album"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-default pb-3">
          <div>
            <h2 className="text-lg font-semibold text-main">Rediger album</h2>
            <p className="text-sm text-muted">Opdater navn, lokation m.m.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-main hover:text-muted transition-[transform,color] duration-200 ease-in-out hover:scale-125 active:scale-95"
          >
            <span className="sr-only">Luk</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pt-4 space-y-4">
          <div>
            <label htmlFor="name" className="label">Navn</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              maxLength={50}
              ref={nameRef}
              required
              className="input"
            />
            <p className="mt-2 text-xs text-muted">{name.length}/50</p>
          </div>
          <div>
            <label htmlFor="infoText" className="label">Infotekst</label>
            <textarea
              id="infoText"
              value={infoText}
              onChange={(e) => setInfoText(e.target.value.slice(0, 300))}
              maxLength={300}
              rows={3}
              ref={infoTextRef}
              className="input min-h-22 resize-none overflow-hidden"
            />
            <p className="mt-2 text-xs text-muted">{infoText.length}/300</p>
          </div>
          <div>
            <label htmlFor="coverImage" className="label">Albumcover</label>
            <div className="flex">
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="group relative h-40 w-40 md:h-60 md:w-60 lg:h-96 lg:w-96 overflow-hidden rounded-lg border-2 border-default bg-surface-elevated transition hover:border-default-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-color-ocean-500"
                aria-label="Skift albumcover"
              >
                {displayCoverUrl ? (
                  <Image
                    src={displayCoverUrl}
                    alt="Albumcover"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex items-center justify-center text-xs md:text-sm font-semibold text-muted">
                    Vælg cover
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {coverFile ? 'Skift' : 'Vælg'}
                </div>
              </button>
              <input
                ref={coverInputRef}
                id="coverImage"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif"
                onChange={(event) =>
                  setCoverFile(event.target.files?.[0] ?? null)
                }
                className="hidden"
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              Tilladte filtyper: GIF/PNG/JPG/WebP/HEIC. Maks 50MB.
            </p>
          </div>
          <div>
            <label className="label">Vælg Lokation</label>
            <AlbumLocationPicker
              value={location}
              onChange={(value) => setLocation(value)}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>
                {location
                  ? `Lat ${location.lat.toFixed(5)}, Lng ${location.lng.toFixed(5)}`
                  : 'Ingen lokation valgt'}
              </span>
              {location ? (
                <button
                  type="button"
                  onClick={() => setLocation(null)}
                  className="text-xs font-semibold text-muted hover:text-main"
                >
                  Ryd lokation
                </button>
              ) : null}
            </div>
          </div>
          <div>
            <label htmlFor="locationName" className="label">Stednavn</label>
            <input
              type="text"
              id="locationName"
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              placeholder="F.eks. København"
              className="input"
            />
            <p className="mt-2 text-xs text-muted">
              Dette bliver navnet på kortet.
            </p>
          </div>
          <div>
            <label htmlFor="category" className="label">Kategori</label>
            <button
              id="category"
              type="button"
              onClick={() => setIsCategoryOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-lg border-2 border-default bg-surface px-3 py-2 text-left text-sm font-medium text-main transition-colors hover:border-default-hover"
              aria-expanded={isCategoryOpen}
            >
              <span>{CATEGORY_LABELS[category]}</span>
              <ChevronDown
                size={18}
                className={`text-muted transition-transform duration-300 ${
                  isCategoryOpen ? 'rotate-180' : 'rotate-0'
                }`}
                aria-hidden
              />
            </button>
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                maxHeight: isCategoryOpen ? '400px' : '0px',
                opacity: isCategoryOpen ? 1 : 0,
                transform: isCategoryOpen ? 'translateY(0)' : 'translateY(-4px)',
                pointerEvents: isCategoryOpen ? 'auto' : 'none',
                marginTop: isCategoryOpen ? '0.5rem' : '0rem',
              }}
            >
              <div
                className={`space-y-1 rounded-xl bg-surface-elevated/30 p-2 transition-transform duration-200 ease-out sm:bg-surface-elevated/40 ${
                  isCategoryOpen ? 'translate-y-0' : '-translate-y-1'
                }`}
              >
                {CATEGORY_ORDER.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategory(cat);
                        setIsCategoryOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                        isSelected
                          ? 'border-2 bg-surface-elevated text-main'
                          : 'text-muted hover:bg-surface-elevated/60 sm:border sm:border-transparent sm:hover:border-default'
                      }`}
                      style={isSelected ? { borderColor: 'var(--color-ocean-500)' } : undefined}
                      aria-pressed={isSelected}
                    >
                      <span>{CATEGORY_LABELS[cat]}</span>
                      {isSelected && <span className="text-xs text-muted">Valgt</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Annuller
            </button>
            <button type="submit" disabled={isPending} className="btn btn-primary btn-sm">
              {isPending ? 'Gemmer...' : 'Gem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
