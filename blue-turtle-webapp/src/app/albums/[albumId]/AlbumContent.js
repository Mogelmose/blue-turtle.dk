'use client';
import { useState } from 'react';
import AppHeader from '../../components/AppHeader';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import EditAlbumModal from '../../components/EditAlbumModal';
import ReactDOM from 'react-dom';

export default function AlbumContent({ initialAlbum }) {
  const [album, setAlbum] = useState(initialAlbum);
  const [media, setMedia] = useState(initialAlbum?.media || []);
  const [uploading, setUploading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  const handleAlbumUpdated = (updatedAlbum) => {
    setAlbum(updatedAlbum);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ];
    if (!allowedMimeTypes.includes(file.type)) {
      alert(
        'Filtypen er ikke tilladt. Vælg venligst et billede eller en video i et understøttet format.'
      );
      event.target.value = '';
      return;
    }

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Filen skal være mindre end 20MB.');
      event.target.value = '';
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('albumId', album.id);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.media) {
        setMedia((prevMedia) => [...prevMedia, data.media]);
      } else {
        alert(`Upload fejlede: ${data.error}`);
        console.error(`Upload fejlede: ${data.error}`);
      }
    } catch (error) {
      alert('En fejl skete under upload af fil.');
      console.error('Upload error:', error);
    }

    setUploading(false);
  };

  if (!album) {
    return <div>Album not found or failed to load.</div>;
  }

  return (
    <div className="bg-white text-gray-800">
      <div className="flex min-h-screen flex-col">
        <AppHeader />

        <div className="w-full">
          <Image
            src="/static/banner.jpg"
            alt="Banner"
            className="w-full object-cover"
            width={1920}
            height={1080}
            priority
          />
        </div>

        <main className="flex-1 bg-white px-4 py-8 text-black">
          <div className="flex items-center justify-between bg-gray-900 p-4 text-white">
            <div className="flex items-baseline gap-4">
              <h1 className="font-heading text-4xl font-bold uppercase">
                {album.name}
              </h1>
              <span className="text-base">{album.infoText}</span>
            </div>
            <div className="flex items-center gap-4">
              {session?.user.role === 'ADMIN' && (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="btn btn-primary"
                >
                  Rediger album
                </button>
              )}
              <button
                type="button"
                onClick={() => document.getElementById('file-upload').click()}
                className="btn btn-primary"
                disabled={uploading}
              >
                {uploading ? (
                  <div className="spinner"></div>
                ) : (
                  'Upload'
                )}
              </button>
              <input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                disabled={uploading}
                accept="image/jpeg,image/png,image/gif,image/webp,image/heic,video/mp4,video/webm,video/quicktime"
                className="hidden"
              />
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {media.map((item) => {
                const imageExtensions = [
                  '.jpg',
                  '.jpeg',
                  '.png',
                  '.gif',
                  '.webp',
                  '.heic',
                  '.heif',
                ];
                const videoExtensions = ['.mp4', '.webm', '.mov'];
                const url = item.url.toLowerCase();
                const isImage = imageExtensions.some((ext) => url.endsWith(ext));
                const isVideo = videoExtensions.some((ext) => url.endsWith(ext));
                return (
                  <div key={item.id} className="photo-item">
                    {isImage ? (
                      <Image
                        src={item.url}
                        alt={item.alt || album.name}
                        width={400}
                        height={400}
                        unoptimized
                        className="h-auto w-full rounded-lg object-cover shadow-md"
                      />
                    ) : isVideo ? (
                      <video
                        src={item.url}
                        controls
                        width={400}
                        height={400}
                        className="h-auto w-full rounded-lg object-cover shadow-md"
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <span>Ukendt filtype</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        <footer className="bg-gray-900 p-4 text-center text-white">
          <p>&copy; 2025 Blue Turtle. Alle rettigheder forbeholdes.</p>
        </footer>
      </div>
      {typeof window !== 'undefined' &&
        isEditModalOpen &&
        ReactDOM.createPortal(
          <EditAlbumModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            album={album}
            onAlbumUpdated={handleAlbumUpdated}
          />,
          document.body
        )}
    </div>
  );
}