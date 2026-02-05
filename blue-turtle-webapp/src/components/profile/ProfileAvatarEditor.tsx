'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

const ALLOWED_FILE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const ALLOWED_FILE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'heic',
  'heif',
]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

type Props = {
  userId: string;
  username: string;
  initialAvatarUrl: string;
};

export default function ProfileAvatarEditor({
  userId,
  username,
  initialAvatarUrl,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!status) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setStatus(null);
    }, 10000);

    return () => clearTimeout(timer);
  }, [status]);

  const handlePick = () => {
    inputRef.current?.click();
  };

  const isAllowedFile = (file: File) => {
    if (ALLOWED_FILE_TYPES.has(file.type)) {
      return true;
    }
    const extension = file.name.split('.').pop()?.toLowerCase();
    return extension ? ALLOWED_FILE_EXTENSIONS.has(extension) : false;
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setStatus(null);

    if (!isAllowedFile(file)) {
      setError('Ikke tilladt filtype.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('Filen er for stor.');
      event.target.value = '';
      return;
    }

    const previousUrl = avatarUrl;
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);
    setIsUploading(true);

    try {
      const data = new FormData();
      data.append('file', file);

      const response = await fetch(`/api/users/${userId}/avatar`, {
        method: 'POST',
        body: data,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Upload fejlede.');
      }

      const refreshedUrl = `${
        payload?.avatarUrl || `/api/users/${userId}/avatar`
      }?ts=${Date.now()}`;

      setAvatarUrl(refreshedUrl);
      setStatus('Profilbillede opdateret!');
    } catch (uploadError) {
      console.error('Billede upload fejlede:', uploadError);
      setAvatarUrl(previousUrl);
      setError('Kunne ikke opdatere profilbillede. Prøv igen.');
    } finally {
      URL.revokeObjectURL(previewUrl);
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="flex w-full flex-col items-left gap-3">
      <button
        type="button"
        onClick={handlePick}
        disabled={isUploading}
        className="group relative h-40 w-40 md:h-60 md:w-60 xl:w-70 xl:h-70 overflow-hidden rounded-full border-2 border-default bg-surface-elevated transition hover:border-default-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-color-ocean-500 disabled:cursor-not-allowed"
        aria-label="Skift avatar"
      >
        <Image
          src={avatarUrl}
          alt={`Avatar for ${username}`}
          fill
          unoptimized
          className="object-cover"
          onError={() => setAvatarUrl('/static/logo.png')}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
          {isUploading ? 'Uploader...' : 'Skift'}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="h-16 w-full">
        {error && (
          <div
            className="alert-danger animate-status-in w-48 rounded-lg shadow-sm flex items-center gap-2 text-xs font-semibold"
            role="alert"
          >
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {status && !error && (
          <div
            className="alert-success animate-status-in w-48 rounded-lg shadow-sm flex items-center gap-2 text-xs font-semibold"
            role="status"
            aria-live="polite"
          >
            <CheckCircleIcon className="h-4 w-4 shrink-0" />
            <span>{status}</span>
          </div>
        )}
      </div>
    </div>
  );
}

