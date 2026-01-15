import type { AlbumSummary } from '../../lib/types/homepage';
import HomeAlbumCard from './HomeAlbumCard';

type Props = {
  albums: AlbumSummary[];
};

export default function RecentAlbums({ albums }: Props) {
  return (
    <section id="home-albums" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-main">Seneste albums</h2>
        <span className="text-sm text-muted">{albums.length} viste</span>
      </div>
      {albums.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
          {albums.map((album) => (
            <HomeAlbumCard key={album.id} album={album} />
          ))}
        </div>
      ) : (
        <div className="card text-center">
          <p className="text-muted">Ingen albums endnu.</p>
        </div>
      )}
    </section>
  );
}
