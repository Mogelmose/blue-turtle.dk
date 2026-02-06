'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

type UploadMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

type AlbumOption = {
  id: string;
  name: string;
  category: 'REJSER' | 'SPILLEAFTEN' | 'JULEFROKOST';
};

type UploadSummary = {
  successCount: number;
  failureCount: number;
  totalCount: number;
};

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const ALLOWED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'heic',
  'heif',
  'mp4',
  'webm',
  'mov',
]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const CATEGORY_LABELS: Record<AlbumOption['category'], string> = {
  REJSER: 'Rejser',
  SPILLEAFTEN: 'Spilleaftener',
  JULEFROKOST: 'Julefrokoster',
};

const CATEGORY_ORDER: AlbumOption['category'][] = [
  'REJSER',
  'SPILLEAFTEN',
  'JULEFROKOST',
];

function validateFile(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const isMimeAllowed = file.type ? ALLOWED_MIME_TYPES.has(file.type) : false;
  const isExtensionAllowed = ALLOWED_EXTENSIONS.has(extension);

  if (!isMimeAllowed && !isExtensionAllowed) {
    return 'Filtypen er ikke tilladt.';
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'Filen skal være mindre end 50MB.';
  }

  return null;
}

export default function UploadMenu({ isOpen, onClose }: UploadMenuProps) {
  const [step, setStep] = useState<'album' | 'files'>('album');
  const [albums, setAlbums] = useState<AlbumOption[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState('');
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [albumError, setAlbumError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [expandedCategories, setExpandedCategories] = useState<
    Set<AlbumOption['category']>
  >(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchAlbums = useCallback(async () => {
    setIsLoadingAlbums(true);
    setAlbumError(null);

    try {
      const response = await fetch('/api/albums?limit=200&summary=1');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Kunne ikke hente albums');
      }

      const options = Array.isArray(data?.albums)
        ? data.albums
            .map((album: AlbumOption) => ({
              id: album.id,
              name: album.name,
              category: album.category,
            }))
            .filter((album) => CATEGORY_ORDER.includes(album.category))
        : [];

      setAlbums(options);
    } catch (error) {
      console.error('Error fetching albums:', error);
      setAlbumError('Kunne ikke hente albums.');
    } finally {
      setIsLoadingAlbums(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setStep('album');
      setSelectedAlbumId('');
      setUploading(false);
      setUploadSummary(null);
      setUploadErrors([]);
      setAlbumError(null);
      setUploadProgress({ current: 0, total: 0 });
      setExpandedCategories(new Set());
      return;
    }

    if (albums.length === 0 && !isLoadingAlbums && !albumError) {
      void fetchAlbums();
    }
  }, [albumError, albums.length, fetchAlbums, isLoadingAlbums, isOpen]);

  useEffect(() => {
    if (!isOpen) {
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

  const selectedAlbum = albums.find((album) => album.id === selectedAlbumId);
  const groupedAlbums = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    albums: albums.filter((album) => album.category === category),
  }));

  const toggleCategory = (category: AlbumOption['category']) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleNextStep = () => {
    if (!selectedAlbumId) {
      setAlbumError('Vælg et album først.');
      return;
    }
    setAlbumError(null);
    setStep('files');
  };

  const handleChooseFiles = () => {
    if (!selectedAlbumId || uploading) {
      return;
    }
    fileInputRef.current?.click();
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    setUploadErrors([]);
    setUploadSummary(null);
    setUploadProgress({ current: 0, total: files.length });

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      setUploadProgress({ current: i + 1, total: files.length });

      const validationError = validateFile(file);
      if (validationError) {
        failureCount += 1;
        errors.push(`${file.name}: ${validationError}`);
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('albumId', selectedAlbumId);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();

        if (!response.ok || !data?.success) {
          failureCount += 1;
          errors.push(`${file.name}: ${data?.error || 'Upload fejlede.'}`);
        } else {
          successCount += 1;
        }
      } catch (error) {
        failureCount += 1;
        errors.push(`${file.name}: Upload fejlede.`);
      }
    }

    setUploading(false);
    setUploadErrors(errors);
    setUploadSummary({ successCount, failureCount, totalCount: files.length });

    if (successCount > 0) {
      window.dispatchEvent(
        new CustomEvent('album-media-updated', {
          detail: { albumId: selectedAlbumId },
        }),
      );
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (files.length === 0) {
      return;
    }

    await uploadFiles(files);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg overflow-y-auto shadow-xl overscroll-contain scrollbar-subtle scrollbar-gutter-stable"
        role="dialog"
        aria-modal="true"
        aria-label="Upload medier"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-default pb-3">
          <div>
            <h2 className="text-lg font-semibold text-main">Upload medier</h2>
            <p className="text-sm text-muted">Vælg det album du gerne vil uploade til.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-main hover:text-muted transition-[transform,color] duration-200 ease-in-out hover:scale-125 active:scale-95"
          >
            <span className="sr-only">Luk</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="pt-4 space-y-4">
          {step === 'album' ? (
            <div className="space-y-3">
              <div>
                {isLoadingAlbums && (
                  <p className="mt-2 text-sm text-muted">Henter albums...</p>
                )}
                {!isLoadingAlbums && albums.length === 0 && !albumError && (
                  <p className="mt-2 text-sm text-muted">
                    Ingen albums endnu. Opret et album først.
                  </p>
                )}
                {albumError && <p className="mt-2 text-sm text-danger">{albumError}</p>}
                {!isLoadingAlbums && albums.length > 0 && (
                  <div className="mt-0 space-y-4">
                    {groupedAlbums.map((group) => (
                      <div key={group.category}>
                        <button
                          type="button"
                          onClick={() => toggleCategory(group.category)}
                          className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left"
                          aria-expanded={expandedCategories.has(group.category)}
                        >
                          <span className="text-base font-semibold text-main">
                            {group.label}
                          </span>
                          <ChevronDown
                            size={18}
                            className={`text-muted transition-transform duration-300 ${
                              expandedCategories.has(group.category) ? 'rotate-180' : 'rotate-0'
                            }`}
                            aria-hidden
                          />
                        </button>
                        <div
                          className="overflow-hidden transition-all duration-300 ease-in-out"
                          style={{
                            maxHeight: expandedCategories.has(group.category) ? '900px' : '0px',
                            opacity: expandedCategories.has(group.category) ? 1 : 0,
                            transform: expandedCategories.has(group.category)
                              ? 'translateY(0)'
                              : 'translateY(-4px)',
                            pointerEvents: expandedCategories.has(group.category)
                              ? 'auto'
                              : 'none',
                            marginTop: expandedCategories.has(group.category) ? '0.5rem' : '0rem',
                          }}
                        >
                          <div
                            className={`space-y-1 rounded-xl bg-surface-elevated/30 p-2 pl-6 transition-transform duration-200 ease-out sm:bg-surface-elevated/40 sm:pl-4 sm:pr-4 ${
                              expandedCategories.has(group.category)
                                ? 'translate-y-0'
                                : '-translate-y-1'
                            }`}
                          >
                            {group.albums.length === 0 ? (
                              <p className="text-sm text-muted">
                                Ingen albums i denne kategori.
                              </p>
                            ) : (
                              group.albums.map((album) => {
                                const isSelected = selectedAlbumId === album.id;
                                return (
                                    <button
                                      key={album.id}
                                      type="button"
                                      onClick={() => setSelectedAlbumId(album.id)}
                                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                                        isSelected
                                        ? 'border-2 bg-surface-elevated text-main'
                                        : 'text-muted hover:bg-surface-elevated/60 sm:border sm:border-transparent sm:hover:border-default'
                                      }`}
                                      style={
                                        isSelected ? { borderColor: 'var(--color-ocean-500)' } : undefined
                                      }
                                      aria-pressed={isSelected}
                                    >
                                    <span>{album.name}</span>
                                    {isSelected && (
                                      <span className="text-xs text-muted">Valgt</span>
                                    )}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
                  Annuller
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="btn btn-primary btn-sm"
                  disabled={!selectedAlbumId || isLoadingAlbums}
                >
                  Næste
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted pb-2">Du er i gang med at uploade til</p>
                <p className="text-base font-semibold text-main pb-2">
                  {selectedAlbum?.name || 'Ukendt album'}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  className="btn btn-secondary btn-md"
                  onClick={() => setStep('album')}
                  disabled={uploading}
                >
                  Skift album
                </button>
                <button
                  type="button"
                  onClick={handleChooseFiles}
                  className="btn btn-primary btn-md"
                  disabled={uploading}
                >
                  {uploading
                    ? `Uploader ${uploadProgress.current}/${uploadProgress.total}`
                    : 'Vælg filer'}
                </button>
                <p className="text-xs text-muted">
                  Du kan vælge flere filer på en gang (maks 50MB pr. fil).
                </p>
              </div>

              {uploadSummary && (
                <div className="alert-success">
                  Upload færdig: {uploadSummary.successCount} af{' '}
                  {uploadSummary.totalCount} filer blev uploadet.
                  {uploadSummary.failureCount > 0 &&
                    ` ${uploadSummary.failureCount} fejlede.`}
                </div>
              )}

              {uploadErrors.length > 0 && (
                <div className="alert-danger">
                  <p className="font-semibold">Nogle filer fejlede:</p>
                  <ul className="mt-2 text-sm space-y-1">
                    {uploadErrors.slice(0, 4).map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                    {uploadErrors.length > 4 && (
                      <li>+ {uploadErrors.length - 4} flere</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          disabled={uploading}
          accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime"
          className="hidden"
        />
      </div>
    </div>
  );
}
