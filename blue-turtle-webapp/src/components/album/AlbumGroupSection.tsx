import AlbumGridCard from './AlbumGridCard';
import type { AlbumSummary } from '../../lib/types/homepage';

type Props = {
  title: string;
  albums: AlbumSummary[];
};

export default function AlbumGroupSection({ title, albums }: Props) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-main">{title}</h2>
        <span className="text-sm text-muted">{albums.length} albums</span>
      </div>
      {albums.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {albums.map((album) => (
            <AlbumGridCard key={album.id} album={album} />
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
