import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { buildSignedMediaUrl } from '@/lib/signedUrl';
import AlbumContent from './AlbumContent';

type AlbumWithMedia = Prisma.AlbumGetPayload<{ include: { media: true } }>;
type AlbumWithSignedMedia = Omit<AlbumWithMedia, 'media'> & {
  media: AlbumWithMedia['media'];
};

async function getAlbumData(albumId: string): Promise<AlbumWithMedia | null> {
  try {
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      include: {
        media: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!album) {
      return album;
    }

    const media = album.media.map((item) => ({
      ...item,
      url: buildSignedMediaUrl(item.url, item.mimeType ?? null),
    }));

    return { ...album, media } as AlbumWithSignedMedia;
  } catch (error) {
    console.error('Error fetching album:', error);
    throw error;
  }
}

type AlbumPageProps = {
  params: {
    albumId: string;
  };
};

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { albumId } = await params;
  const albumData = await getAlbumData(albumId);

  if (!albumData) {
    notFound();
  }

  return <AlbumContent initialAlbum={albumData} />;
}
