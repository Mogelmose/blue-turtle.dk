// src/components/album/AlbumHeader.jsx
'use client';

import { useSession } from 'next-auth/react';
import Button from '../ui/Button';

export default function AlbumHeader({ album, onEdit, onUpload, isUploading }) {
  const { data: session } = useSession();

  return (
    <div className="py-8 border-b border-gray-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{album.name}</h1>
          <p className="mt-1 text-lg text-gray-600">{album.infoText}</p>
        </div>
        <div className="flex items-center gap-2">
          {session?.user.role === 'ADMIN' && (
            <Button variant="secondary" onClick={onEdit}>
              Rediger album
            </Button>
          )}
          <Button onClick={onUpload} loading={isUploading}>
            {isUploading ? 'Uploader...' : 'Upload'}
          </Button>
        </div>
      </div>
    </div>
  );
}