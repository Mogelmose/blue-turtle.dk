// src/components/media/MediaCard.jsx
import Image from 'next/image';

export default function MediaCard({ item }) {
  const isImage = item.url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/);
  const isVideo = item.url.toLowerCase().match(/\.(mp4|webm|mov)$/);

  return (
    <div className="group relative aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden">
      {isImage ? (
        <Image
          src={item.url}
          alt={item.alt || ''}
          layout="fill"
          objectFit="cover"
          className="group-hover:opacity-75 transition-opacity"
          unoptimized
        />
      ) : isVideo ? (
        <video
          src={item.url}
          controls
          className="w-full h-full object-cover"
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="flex items-center justify-center h-full">
          <span className="text-sm text-gray-500">Ukendt filtype</span>
        </div>
      )}
    </div>
  );
}