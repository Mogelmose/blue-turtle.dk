'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { AlbumSummary } from '../../lib/types/homepage';
import HomeAlbumCard from './HomeAlbumCard';

type Props = {
  albums: AlbumSummary[];
};

export default function RecentAlbums({ albums }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasOverflow = albums.length > 6;
  const visibleAlbums = useMemo(() => {
    if (!hasOverflow || isExpanded) {
      return albums;
    }
    return albums.slice(0, 6);
  }, [albums, hasOverflow, isExpanded]);

  return (
    <section id="home-albums" className="space-y-4 mb-2 md:mb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-main">Seneste albums</h2>
        <span className="text-sm text-muted">{albums.length} viste</span>
      </div>
      {albums.length > 0 ? (
        <>
          <div className="flex gap-4 overflow-x-auto pb-0 sm:hidden">
            {albums.map((album) => (
              <HomeAlbumCard key={album.id} album={album} />
            ))}
          </div>
          <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {visibleAlbums.map((album) => (
              <HomeAlbumCard key={album.id} album={album} />
            ))}
          </div>
          {hasOverflow && (
            <div className="hidden sm:flex justify-center">
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="rounded-full border-2 border-default bg-surface p-2 text-main transition-all duration-200 hover:border-default-hover hover:bg-surface-elevated"
                aria-expanded={isExpanded}
              >
                <span className="sr-only">
                  {isExpanded ? 'Skjul ekstra albums' : 'Vis alle albums'}
                </span>
                <ChevronDown
                  size={20}
                  className={`transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : 'rotate-0'
                  }`}
                  aria-hidden
                />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center">
          <p className="text-muted">Ingen albums endnu.</p>
        </div>
      )}
    </section>
  );
}
