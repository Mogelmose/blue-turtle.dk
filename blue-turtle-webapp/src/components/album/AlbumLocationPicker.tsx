'use client';

import { useEffect, useRef, type RefObject } from 'react';
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';

type LocationValue = { lat: number; lng: number } | null;

type Props = {
  value: LocationValue;
  onChange: (value: { lat: number; lng: number }) => void;
};

const DEFAULT_CENTER: [number, number] = [56.2639, 9.5018];
const DEFAULT_ZOOM = 6;
const SELECTED_ZOOM = 12;

function LocationMarker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: Props['onChange'];
}) {
  useMapEvents({
    click: (event) => {
      onChange({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  if (!value) {
    return null;
  }

  return (
    <CircleMarker
      center={[value.lat, value.lng]}
      radius={10}
      pathOptions={{
        color: '#0ea5e9',
        fillColor: '#38bdf8',
        fillOpacity: 0.9,
      }}
    />
  );
}

function MapFocus({ value }: { value: LocationValue }) {
  const map = useMap();

  useEffect(() => {
    if (!value) {
      return;
    }
    map.setView([value.lat, value.lng], Math.max(map.getZoom(), SELECTED_ZOOM), {
      animate: true,
    });
  }, [map, value]);

  return null;
}

function MapResizeHandler({ containerRef }: { containerRef: RefObject<HTMLDivElement> }) {
  const map = useMap();

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const handleResize = () => {
      map.invalidateSize();
    };

    handleResize();
    const observer = new ResizeObserver(() => handleResize());
    observer.observe(containerRef.current);
    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [containerRef, map]);

  return null;
}

export default function AlbumLocationPicker({ value, onChange }: Props) {
  const center: [number, number] = value ? [value.lat, value.lng] : DEFAULT_CENTER;
  const zoom = value ? SELECTED_ZOOM : DEFAULT_ZOOM;
  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={containerRef}
      className="h-66 sm:h-80 lg:h-96 w-full overflow-hidden rounded-xl border-2 border-default shadow-sm"
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker value={value} onChange={onChange} />
        <MapFocus value={value} />
        <MapResizeHandler containerRef={containerRef} />
      </MapContainer>
    </div>
  );
}
