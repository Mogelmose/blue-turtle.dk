'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { icon, latLngBounds } from 'leaflet';
import type { GeomapAlbum, GeomapMedia } from '@/lib/types/geomap';

type Props = {
  albums: GeomapAlbum[];
  media: GeomapMedia[];
};

const DEFAULT_CENTER: [number, number] = [56.2639, 9.5018];
const DEFAULT_ZOOM = 5;
const MAX_FIT_ZOOM = 12;


const albumIcon = icon({
  iconUrl: '/geomap/album-pin.svg',
  iconSize: [36, 48],
  iconAnchor: [18, 46],
  popupAnchor: [0, -40],
});

const pictureIcon = icon({
  iconUrl: '/geomap/picture-pin.svg',
  iconSize: [20, 38],
  iconAnchor: [10, 28],
  popupAnchor: [0, -20],
});

const videoIcon = icon({
  iconUrl: '/geomap/video-pin.svg',
  iconSize: [20, 38],
  iconAnchor: [10, 28],
  popupAnchor: [0, -20],
});


function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      return;
    }
    const bounds = latLngBounds(points);
    map.fitBounds(bounds, { padding: [42, 42], maxZoom: MAX_FIT_ZOOM, animate: true });
  }, [map, points]);

  return null;
}

function getMediaLabel(mimeType: string | null) {
  if (!mimeType) {
    return 'Medie';
  }
  if (mimeType.startsWith('video/')) {
    return 'Video';
  }
  if (mimeType.startsWith('image/')) {
    return 'Billede';
  }
  return 'Medie';
}

function getSourceLabel(source: GeomapMedia['locationSource']) {
  if (!source || source === 'NONE') {
    return null;
  }
  return source === 'VIDEO_META' ? 'Video metadata' : 'EXIF';
}

export default function GeomapClient({ albums, media }: Props) {
  const albumIconMemo = useMemo(() => albumIcon, []);
  const pictureIconMemo = useMemo(() => pictureIcon, []);
  const videoIconMemo = useMemo(() => videoIcon, []);
  const points = useMemo<[number, number][]>(() => {
    const albumPoints = albums.map((album) => [album.latitude, album.longitude] as [number, number]);
    const mediaPoints = media.map((item) => [item.locationAutoLat, item.locationAutoLng] as [number, number]);
    return [...albumPoints, ...mediaPoints];
  }, [albums, media]);

  const albumCount = albums.length;
  const mediaCount = media.length;
  const videoCount = media.filter((item) => item.mimeType?.startsWith('video/')).length;
  const pictureCount = mediaCount - videoCount;
  const hasPoints = points.length > 0;

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
      <div className="card card-gradient p-4 sm:p-5">
        <div className="relative h-[52vh] min-h-52 md:h-[76vh] lg:h-[84vh] overflow-hidden rounded-xl border-2 border-default bg-surface">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom
            className="h-full w-full"
            style={{ zIndex: 0 }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {albums.map((album) => (
              <Marker
                key={`album-${album.id}`}
                icon={albumIconMemo}
                position={[album.latitude, album.longitude]}
              >
                <Popup>
                  <div className="space-y-2">
                    <div>
                      <p className="text-base font-semibold text-primary">{album.name}</p>
                      <p className="text-sm text-main">
                        {album.locationName || 'Album-lokation'}
                      </p>
                    </div>
                    <p className="text-xs text-muted">{album.mediaCount} medier</p>
                    <Link className="link text-sm" href={`/albums/${album.id}`}>
                      Åbn album
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
            {media.map((item) => {
              const sourceLabel = getSourceLabel(item.locationSource);
              const isVideo = Boolean(item.mimeType?.startsWith('video/'));
              const mediaIcon = isVideo ? videoIconMemo : pictureIconMemo;
              return (
                <Marker
                  key={`media-${item.id}`}
                  icon={mediaIcon}
                  position={[item.locationAutoLat, item.locationAutoLng]}
                >
                  <Popup>
                    <div className="space-y-2">
                      <div>
                        <p className="text-base font-semibold text-primary">
                          {getMediaLabel(item.mimeType)}
                        </p>
                        <p className="text-sm text-main">Album: {item.albumName}</p>
                      </div>
                      {sourceLabel ? (
                        <p className="text-xs text-muted">Kilde: {sourceLabel}</p>
                      ) : null}
                      <Link className="link text-sm" href={`/albums/${item.albumId}?media=${item.id}`}>
                        {isVideo ? 'Gå til video' : 'Gå til billede'}
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            <FitBounds points={points} />
          </MapContainer>
          {!hasPoints ? (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/80">
              <div className="text-center text-sm text-muted">
                Der er ingen lokationer at vise endnu.
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-main">Overblik</h2>
            <span className="text-xs font-semibold text-muted">
              {albumCount + mediaCount} punkter på kortet i alt
            </span>
          </div>
          <div className="space-y-2 text-sm text-muted">
            <div className="flex items-center gap-2">
              <img src="/geomap/album-pin.svg" alt="Album ikon" className="h-6 w-6" />
              {albumCount} Album lokationer
            </div>
            <div className="flex items-center gap-2">
              <img src="/geomap/picture-pin.svg" alt="Billede ikon" className="h-6 w-6" />
              {pictureCount} Billede lokationer
            </div>
            <div className="flex items-center gap-2">
              <img src="/geomap/video-pin.svg" alt="Video ikon" className="h-6 w-6" />
              {videoCount} Video lokationer
            </div>
          </div>
          <p className="text-xs text-muted">
            Lokationer for albummer er valgt af brugeren, mens lokationer for medier er automatisk udledt fra metadata. Klik på et punkt på kortet for at se detaljer og navigere til det relevante album/medie.
          </p>
        </div>

        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-main">Album lokationer</h3>
            <span className="text-xs text-muted">{albumCount} i alt</span>
          </div>
          {albumCount === 0 ? (
            <p className="text-sm text-muted">Ingen album-lokationer endnu.</p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-2 text-sm text-muted scrollbar-subtle">
              {albums.map((album) => (
                <div
                  key={`album-row-${album.id}`}
                  className="flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-main">{album.name}</p>
                    <p className="text-xs text-muted">
                      {album.locationName || 'Intet lokationsnavn valgt'}
                    </p>
                  </div>
                  <span className="rounded-full border border-default bg-surface px-2 py-1 text-xs font-semibold text-main">
                    {album.mediaCount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </section>
  );
}
