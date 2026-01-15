// src/components/album/AlbumCard.jsx
import Image from 'next/image';
import Link from 'next/link';

export default function AlbumCard({ album }) {
  const hasCover = Boolean(album.coverImage);
  const coverUrl = hasCover ? `/api/albums/${album.id}/cover` : '/static/logo.png';
  const objectFit = hasCover ? 'cover' : 'contain';
  const imageClassName = hasCover
    ? 'group-hover:scale-105 transition-transform duration-200'
    : 'transition-transform duration-200';

  return (
    <Link href={`/albums/${album.id}`}>
      <a className="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 group">
        <div className="aspect-w-16 aspect-h-9 bg-gray-200">
          <Image
            src={coverUrl}
            alt={album.name}
            layout="fill"
            objectFit={objectFit}
            unoptimized
            className={imageClassName}
          />
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg text-gray-900">{album.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{album.media.length} photos</p>
        </div>
      </a>
    </Link>
  );
}
