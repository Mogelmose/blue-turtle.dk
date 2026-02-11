import prisma from './prisma';
import { Category } from '@prisma/client';
import type {
  ActivityItem,
  AlbumSummary,
  HomepageData,
  MapAlbumSummary,
  MediaSummary,
} from './types/homepage';
import { buildSignedMediaUrl, buildSignedUrl } from './signedUrl';

const RECENT_MEDIA_LIMIT = 8;
const ACTIVITY_LIMIT = 6;
const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const CATEGORY_COUNT = Object.keys(Category).length;

export async function getHomepageData(): Promise<HomepageData> {
  const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MS);

  const [
    recentAlbumsRaw,
    recentMediaRaw,
    albumCount,
    mediaCount,
    imageCount,
    videoCount,
    oldestUploadAggregate,
    onlineNowCount,
    mapAlbumsRaw,
    recentAlbumsForActivity,
    recentMediaForActivity,
  ] = await prisma.$transaction([
    prisma.album.findMany({
      select: {
        id: true,
        name: true,
        coverImage: true,
        createdAt: true,
        updatedAt: true,
        media: {
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
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
    prisma.media.count({
      where: {
        mimeType: {
          startsWith: 'image/',
        },
      },
    }),
    prisma.media.count({
      where: {
        mimeType: {
          startsWith: 'video/',
        },
      },
    }),
    prisma.media.aggregate({
      _min: {
        createdAt: true,
      },
    }),
    prisma.user.count({
      where: {
        lastSeenAt: {
          gte: onlineSince,
        },
      },
    }),
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

  const sortedRecentAlbumsRaw = [...recentAlbumsRaw].sort((a, b) => {
    const aLatestMediaAt = a.media[0]?.createdAt?.getTime() ?? 0;
    const bLatestMediaAt = b.media[0]?.createdAt?.getTime() ?? 0;
    const aMostRecentAt = Math.max(a.updatedAt.getTime(), aLatestMediaAt);
    const bMostRecentAt = Math.max(b.updatedAt.getTime(), bLatestMediaAt);

    if (aMostRecentAt !== bMostRecentAt) {
      return bMostRecentAt - aMostRecentAt;
    }

    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const recentAlbums: AlbumSummary[] = sortedRecentAlbumsRaw.map((album) => ({
    id: album.id,
    name: album.name,
    coverImage: album.coverImage,
    coverUrl: album.coverImage
      ? buildSignedUrl(`/api/albums/${album.id}/cover`)
      : null,
    createdAt: album.createdAt,
    mediaCount: album._count.media,
  }));

  const recentMedia: MediaSummary[] = recentMediaRaw.map((media) => ({
    id: media.id,
    url: buildSignedMediaUrl(media.url, media.mimeType ?? null),
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
      imageCount,
      videoCount,
      categoryCount: CATEGORY_COUNT,
      oldestUploadAt: oldestUploadAggregate._min.createdAt ?? null,
      lastUploadAt: recentMedia[0]?.createdAt ?? null,
      onlineNowCount,
    },
  };
}
