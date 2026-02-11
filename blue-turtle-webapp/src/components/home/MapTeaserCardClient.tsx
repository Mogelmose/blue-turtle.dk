'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { icon, latLngBounds } from 'leaflet';
import type { MapAlbumSummary } from '../../lib/types/homepage';

type Props = {
  mapAlbums: MapAlbumSummary[];
};

const DEFAULT_CENTER: [number, number] = [56.2639, 9.5018];
const DEFAULT_ZOOM = 6;
const MAX_FIT_ZOOM = 12;
const albumPreviewIcon = icon({
  iconUrl: '/geomap/album-pin.svg',
  iconSize: [36, 48],
  iconAnchor: [18, 46],
  popupAnchor: [0, -40],
});

type TeaserLocation = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

function FocusBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      return;
    }
    const bounds = latLngBounds(points);
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: MAX_FIT_ZOOM, animate: false });
  }, [map, points]);

  return null;
}

function pickDenseCluster(locations: TeaserLocation[]) {
  if (locations.length <= 4) {
    return locations;
  }

  // Basic density heuristic tuned for Denmark-scale album clusters.
  const LAT_RADIUS = 0.9;
  const LNG_RADIUS = 1.4;

  let bestIndex = 0;
  let bestCount = 0;

  for (let i = 0; i < locations.length; i += 1) {
    const center = locations[i];
    let count = 0;
    for (let j = 0; j < locations.length; j += 1) {
      const point = locations[j];
      const inLat = Math.abs(point.latitude - center.latitude) <= LAT_RADIUS;
      const inLng = Math.abs(point.longitude - center.longitude) <= LNG_RADIUS;
      if (inLat && inLng) {
        count += 1;
      }
    }
    if (count > bestCount) {
      bestCount = count;
      bestIndex = i;
    }
  }

  const center = locations[bestIndex];
  const cluster = locations.filter((location) => {
    const inLat = Math.abs(location.latitude - center.latitude) <= LAT_RADIUS;
    const inLng = Math.abs(location.longitude - center.longitude) <= LNG_RADIUS;
    return inLat && inLng;
  });

  // If no meaningful cluster is found, keep all points.
  return cluster.length >= 3 ? cluster : locations;
}

export default function MapTeaserCardClient({ mapAlbums }: Props) {
  const locations = useMemo<TeaserLocation[]>(
    () =>
      mapAlbums.map((album) => ({
        id: album.id,
        label: album.locationName || album.name,
        latitude: album.latitude,
        longitude: album.longitude,
      })),
    [mapAlbums]
  );

  const focusLocations = useMemo(() => pickDenseCluster(locations), [locations]);
  const points = useMemo<[number, number][]>(
    () => focusLocations.map((location) => [location.latitude, location.longitude]),
    [focusLocations]
  );

  return (
    <section id="home-map" className="mb-2 space-y-4 md:mb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-main">Lokationer</h2>
      </div>
      <div className="card space-y-4">
        <div className="relative h-64 sm:h-96 lg:h-128 xl:h-160 overflow-hidden rounded-lg border-2 border-default">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom={false}
            className="h-full w-full"
            style={{ zIndex: 0 }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {locations.map((location) => (
              <Marker
                key={location.id}
                position={[location.latitude, location.longitude]}
                icon={albumPreviewIcon}
              >
                <Tooltip direction="top" offset={[0, -40]} opacity={1}>
                  {location.label}
                </Tooltip>
              </Marker>
            ))}

            <FocusBounds points={points} />
          </MapContainer>

          {locations.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/85 text-sm font-semibold text-muted">
              Tilføj lokationer til dine albums
            </div>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-slate-900/65 px-4 py-3 text-xs font-semibold text-white backdrop-blur-sm">
            <span>Albums på kortet: {locations.length}</span>
            <Link
              href="/geomap"
              className="rounded-full border border-white/35 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-widest text-white transition hover:bg-white/20"
            >
              Åbn kort
            </Link>
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
