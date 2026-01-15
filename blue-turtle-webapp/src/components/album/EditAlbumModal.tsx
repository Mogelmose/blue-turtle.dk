'use client';
import { useState, useTransition, type ReactNode } from 'react';
import { Album, Category } from '@prisma/client';

interface EditAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  album: Album;
  onAlbumUpdated: (updatedAlbum: Album) => void;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="card w-full max-w-xl shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-default pb-3">
          <h2 className="text-lg font-semibold text-main">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-muted hover:text-main"
            aria-label="Luk"
          >
            Luk
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
}

export default function EditAlbumModal({ isOpen, onClose, album, onAlbumUpdated }: EditAlbumModalProps) {
  const [name, setName] = useState(album.name);
  const [infoText, setInfoText] = useState(album.infoText || '');
  const [category, setCategory] = useState(album.category);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/albums/${album.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, infoText, category }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Noget gik galt');
        }

        onAlbumUpdated(data);
        onClose();
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rediger Album">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Navn</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background shadow-sm focus:border-light-primary focus:ring-light-primary dark:focus:border-dark-primary dark:focus:ring-dark-primary sm:text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="infoText" className="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Infotekst</label>
          <textarea
            id="infoText"
            value={infoText}
            onChange={(e) => setInfoText(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background shadow-sm focus:border-light-primary focus:ring-light-primary dark:focus:border-dark-primary dark:focus:ring-dark-primary sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Kategori</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="mt-1 block w-full rounded-md border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background py-2 pl-3 pr-10 text-base focus:border-light-primary focus:outline-none focus:ring-light-primary dark:focus:border-dark-primary dark:focus:ring-dark-primary sm:text-sm"
          >
            {Object.values(Category).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-light-border dark:border-dark-border hover:bg-light-surface-elevated dark:hover:bg-dark-surface-elevated">
            Annuller
          </button>
          <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-medium text-white rounded-md bg-light-primary hover:bg-light-primary-hover dark:bg-dark-primary dark:text-black dark:hover:bg-dark-primary-hover disabled:opacity-50">
            {isPending ? 'Gemmer...' : 'Gem'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
