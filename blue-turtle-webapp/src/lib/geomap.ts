import prisma from './prisma';
import type { GeomapData } from './types/geomap';

export async function getGeomapData(): Promise<GeomapData> {
  const [albumsRaw, mediaRaw] = await prisma.$transaction([
    prisma.album.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        locationName: true,
        _count: { select: { media: true } },
      },
    }),
    prisma.media.findMany({
      where: {
        locationAutoLat: { not: null },
        locationAutoLng: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        mimeType: true,
        locationAutoLat: true,
        locationAutoLng: true,
        locationSource: true,
        album: { select: { id: true, name: true } },
      },
    }),
  ]);

  const albums = albumsRaw.map((album) => ({
    id: album.id,
    name: album.name,
    latitude: album.latitude ?? 0,
    longitude: album.longitude ?? 0,
    locationName: album.locationName,
    mediaCount: album._count.media,
  }));

  const media = mediaRaw.map((item) => ({
    id: item.id,
    albumId: item.album.id,
    albumName: item.album.name,
    url: item.url,
    mimeType: item.mimeType ?? null,
    locationAutoLat: item.locationAutoLat ?? 0,
    locationAutoLng: item.locationAutoLng ?? 0,
    locationSource: item.locationSource ?? null,
  }));

  return { albums, media };
}
