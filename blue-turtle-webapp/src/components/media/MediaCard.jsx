// src/components/media/MediaCard.jsx
import Image from 'next/image';

export default function MediaCard({ item }) {
  const mimeType = item.mimeType ? item.mimeType.toLowerCase() : "";
  const reference = (item.filename || item.url || "").toLowerCase();
  const isImage = mimeType
    ? mimeType.startsWith("image/")
    : reference.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/);
  const isVideo = mimeType
    ? mimeType.startsWith("video/")
    : reference.match(/\.(mp4|webm|mov)$/);
  const isHeic =
    isImage &&
    (mimeType === "image/heic" ||
      mimeType === "image/heif" ||
      reference.endsWith(".heic") ||
      reference.endsWith(".heif"));
  const displayUrl = isHeic
    ? `${item.url}${item.url.includes("?") ? "&" : "?"}format=jpeg`
    : item.url;

  return (
    <div className="group relative aspect-w-1 aspect-h-1 bg-surface rounded-lg overflow-hidden">
      {isImage ? (
        <Image
          src={displayUrl}
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
          Din browser understøtter ikke videoafspilning.
        </video>
      ) : (
        <div className="flex items-center justify-center h-full">
          <span className="text-sm text-main">Ukendt filtype</span>
        </div>
      )}
    </div>
  );
}
