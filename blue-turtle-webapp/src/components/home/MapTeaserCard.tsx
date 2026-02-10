'use client';

import dynamic from 'next/dynamic';
import type { MapAlbumSummary } from '../../lib/types/homepage';

type Props = {
  mapAlbums: MapAlbumSummary[];
};

const MapTeaserCardClient = dynamic(() => import('./MapTeaserCardClient'), {
  ssr: false,
});

export default function MapTeaserCard(props: Props) {
  return <MapTeaserCardClient {...props} />;
}
