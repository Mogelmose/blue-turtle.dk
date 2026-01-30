import Link from 'next/link';
import type { MapAlbumSummary } from '../../lib/types/homepage';

type Props = {
  mapAlbums: MapAlbumSummary[];
};

export default function MapTeaserCard({ mapAlbums }: Props) {
  const locations = mapAlbums.map((album) => ({
    id: album.id,
    label: album.locationName || album.name,
  }));

  return (
    <section id="home-map" className="space-y-4 mb-2 md:mb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-main">Lokationer</h2>
        <Link href="/geomap" className="link text-sm">
          Åbn kort
        </Link>
      </div>
      <div className="card space-y-4">
        <div
          className="relative h-64 overflow-hidden rounded-lg border-2 border-default"
          style={{
            backgroundImage:
              'linear-gradient(135deg, var(--color-ocean-100), var(--color-ocean-200))',
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-80"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.6), transparent 60%), radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.4), transparent 55%)',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold uppercase tracking-widest text-muted">
            Kort forhåndsvisning
          </div>
        </div>
        {locations.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {locations.map((location) => (
              <span
                key={location.id}
                className="rounded-full border-2 border-default bg-surface px-3 py-1 text-xs font-semibold text-main"
              >
                {location.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Ingen lokationer endnu.</p>
        )}
      </div>
    </section>
  );
}
