'use client';

import dynamic from 'next/dynamic';
import type { GeomapAlbum, GeomapMedia } from '@/lib/types/geomap';

type Props = {
  albums: GeomapAlbum[];
  media: GeomapMedia[];
  totalMediaCount: number;
};

const GeomapClient = dynamic(() => import('./GeomapClient'), {
  ssr: false,
  loading: () => (
    <div className="card card-gradient p-4 sm:p-5">
      <div className="flex h-[52vh] min-h-52 md:h-[76vh] lg:h-[84vh] items-center justify-center rounded-xl border-2 border-default bg-surface text-sm text-muted">
        Indlæser kort...
      </div>
    </div>
  ),
});

export default function GeomapClientWrapper(props: Props) {
  return <GeomapClient {...props} />;
}
