import Image from 'next/image';
import Link from 'next/link';
import { formatShortDate } from '../../lib/date';
import type { AlbumSummary } from '../../lib/types/homepage';

type Props = {
  album: AlbumSummary;
};

export default function AlbumGridCard({ album }: Props) {
  const hasCover = Boolean(album.coverImage);
  const coverUrl = hasCover ? `/api/albums/${album.id}/cover` : '/static/logo.png';
  const imageClassName = hasCover
    ? 'object-cover transition-transform duration-300 group-hover:scale-105'
    : 'object-contain transition-transform duration-300';

  return (
    <Link
      href={`/albums/${album.id}`}
      className="card group overflow-hidden p-0 transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square bg-surface-elevated">
        <Image
          src={coverUrl}
          alt={album.name}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px"
          unoptimized
          className={imageClassName}
        />
      </div>
      <div className="p-2">
        <h3 className="font-semibold text-main">
          {album.name}
        </h3>
        <p className="mt-1 text-xs text-muted">
          {album.mediaCount} medier | {formatShortDate(album.createdAt)}
        </p>
      </div>
    </Link>
  );
}
