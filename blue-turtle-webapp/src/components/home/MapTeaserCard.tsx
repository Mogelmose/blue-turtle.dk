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
  const previewLocations = locations.slice(0, 10);

  const getMarkerPosition = (seed: string, index: number) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) % 10000;
    }
    const left = 10 + ((hash * 37 + index * 13) % 80);
    const top = 12 + ((hash * 53 + index * 17) % 76);
    return { left: `${left}%`, top: `${top}%` };
  };

  return (
    <section id="home-map" className="space-y-4 mb-2 md:mb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-main">Lokationer</h2>
        <Link href="/geomap" className="link text-sm">
          Åbn kort
        </Link>
      </div>
      <div className="card space-y-4">
        <Link href="/geomap" className="group block">
          <div className="relative h-64 overflow-hidden rounded-lg border-2 border-default transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, var(--color-ocean-100), var(--color-ocean-300))',
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0 opacity-70"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.55), transparent 60%), radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.4), transparent 55%)',
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
                backgroundSize: '36px 36px, 36px 36px',
                backgroundPosition: 'center',
              }}
            />
            <svg
              aria-hidden
              className="absolute inset-0 h-full w-full opacity-50"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path
                d="M0,75 C20,65 25,55 40,50 C55,45 60,35 80,30 L100,25"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="1.5"
              />
              <path
                d="M0,35 C15,45 30,40 45,55 C60,70 75,75 100,70"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="1.3"
              />
            </svg>
            <div className="absolute inset-0">
              {previewLocations.map((location, index) => {
                const position = getMarkerPosition(location.id, index);
                return (
                  <div
                    key={location.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={position}
                  >
                    <div
                      className="group/marker relative flex h-5 w-5 items-center justify-center"
                      aria-label={location.label}
                    >
                      <span
                        className={
                          index < 3
                            ? 'absolute inset-0 rounded-full border-2 border-white/60 animate-ping'
                            : 'absolute inset-0 rounded-full border-2 border-white/40'
                        }
                      />
                      <span className="relative h-2.5 w-2.5 rounded-full bg-white shadow" />
                      <span className="absolute left-1/2 top-full mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-800 shadow-lg group-hover/marker:block">
                        {location.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-white/70 px-4 py-3 text-xs font-semibold text-main backdrop-blur-sm">
              <span>
                {previewLocations.length > 0
                  ? `${previewLocations.length} lokationer klar til kortet`
                  : 'Tilføj lokationer til dine albums'}
              </span>
              <span className="rounded-full border border-default bg-white px-3 py-1 text-[11px] uppercase tracking-widest text-main transition group-hover:bg-surface">
                Åbn kort
              </span>
            </div>
          </div>
        </Link>
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
