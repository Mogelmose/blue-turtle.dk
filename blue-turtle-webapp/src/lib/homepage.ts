import prisma from './prisma';
import type {
  ActivityItem,
  AlbumSummary,
  HomepageData,
  MapAlbumSummary,
  MediaSummary,
} from './types/homepage';

const RECENT_MEDIA_LIMIT = 12;
const ACTIVITY_LIMIT = 6;

export async function getHomepageData(): Promise<HomepageData> {
  const [
    recentAlbumsRaw,
    recentMediaRaw,
    albumCount,
    mediaCount,
    mapAlbumsRaw,
    recentAlbumsForActivity,
    recentMediaForActivity,
  ] = await prisma.$transaction([
    prisma.album.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        coverImage: true,
        createdAt: true,
        _count: { select: { media: true } },
      },
    }),
    prisma.media.findMany({
      orderBy: { createdAt: 'desc' },
      take: RECENT_MEDIA_LIMIT,
      select: {
        id: true,
        url: true,
        mimeType: true,
        createdAt: true,
        album: { select: { id: true, name: true } },
      },
    }),
    prisma.album.count(),
    prisma.media.count(),
    prisma.album.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        locationName: true,
      },
    }),
    prisma.album.findMany({
      orderBy: { createdAt: 'desc' },
      take: ACTIVITY_LIMIT,
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    }),
    prisma.media.findMany({
      orderBy: { createdAt: 'desc' },
      take: ACTIVITY_LIMIT,
      select: {
        id: true,
        createdAt: true,
        album: { select: { id: true, name: true } },
      },
    }),
  ]);

  const recentAlbums: AlbumSummary[] = recentAlbumsRaw.map((album) => ({
    id: album.id,
    name: album.name,
    coverImage: album.coverImage,
    createdAt: album.createdAt,
    mediaCount: album._count.media,
  }));

  const recentMedia: MediaSummary[] = recentMediaRaw.map((media) => ({
    id: media.id,
    url: media.url,
    mimeType: media.mimeType ?? null,
    createdAt: media.createdAt,
    albumId: media.album.id,
    albumName: media.album.name,
  }));

  const mapAlbums: MapAlbumSummary[] = mapAlbumsRaw.map((album) => ({
    id: album.id,
    name: album.name,
    latitude: album.latitude ?? 0,
    longitude: album.longitude ?? 0,
    locationName: album.locationName,
  }));

  const albumActivity: ActivityItem[] = recentAlbumsForActivity.map((album) => ({
    id: album.id,
    type: 'album',
    label: `Nyt album: ${album.name}`,
    createdAt: album.createdAt,
    href: `/albums/${album.id}`,
  }));

  const mediaActivity: ActivityItem[] = recentMediaForActivity.map((media) => ({
    id: media.id,
    type: 'media',
    label: `Upload til ${media.album.name}`,
    createdAt: media.createdAt,
    href: `/albums/${media.album.id}`,
  }));

  const activity = [...albumActivity, ...mediaActivity]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, ACTIVITY_LIMIT);

  return {
    recentAlbums,
    recentMedia,
    mapAlbums,
    activity,
    stats: {
      albumCount,
      mediaCount,
      lastUploadAt: recentMedia[0]?.createdAt ?? null,
    },
  };
}
