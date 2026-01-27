import Image from 'next/image';
import Link from 'next/link';
import { formatShortDate } from '../../lib/date';
import type { AlbumSummary } from '../../lib/types/homepage';

type Props = {
  album: AlbumSummary;
};

export default function HomeAlbumCard({ album }: Props) {
  const hasCover = Boolean(album.coverImage);
  const coverUrl = hasCover ? `/api/albums/${album.id}/cover` : '/static/logo.png';
  const imageClassName = hasCover
    ? 'object-cover transition-transform duration-300 group-hover:scale-105'
    : 'object-contain transition-transform duration-300';

  return (
    <Link
      href={`/albums/${album.id}`}
      className="card group w-50 shrink-0 overflow-hidden p-0 transition-all duration-200 hover:translate-y-0.5 hover:border-default-hover hover:bg-surface-elevated hover:shadow-lg sm:w-auto sm:shrink"
    >
      <div className="relative aspect-square bg-surface-elevated md:m-3 rounded-lg overflow-hidden">
        <Image
          src={coverUrl}
          alt={album.name}
          fill
          sizes="(max-width: 640px) 70vw, (max-width: 1024px) 33vw, 240px"
          unoptimized
          className={imageClassName}
        />
      </div>
      <div className="pt-3 md:p-3">
        <h3 className="truncate text-base font-semibold text-main xl:text-xl">
          {album.name}
        </h3>
        <p className="mt-1 text-xs text-muted">
          {album.mediaCount} medier | {formatShortDate(album.createdAt)}
        </p>
      </div>
    </Link>
  );
}
