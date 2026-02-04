'use client';

import { useState } from 'react';
import ReactDOM from 'react-dom';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CreateAlbumModal from '@/components/album/CreateAlbumModal';

export default function CreateAlbumButton() {
  const { data: session, status } = useSession();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const router = useRouter();

  if (status === 'loading' || !session?.user) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsCreateModalOpen(true)}
        className="btn btn-primary btn-sm"
      >
        Opret album
      </button>

      {typeof window !== 'undefined' &&
        isCreateModalOpen &&
        ReactDOM.createPortal(
          <CreateAlbumModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onAlbumCreated={() => router.refresh()}
          />,
          document.body,
        )}
    </>
  );
}
