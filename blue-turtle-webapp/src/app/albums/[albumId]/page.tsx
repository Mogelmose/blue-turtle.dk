import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import AlbumContent from './AlbumContent';

type AlbumWithMedia = Prisma.AlbumGetPayload<{ include: { media: true } }>;

async function getAlbumData(albumId: string): Promise<AlbumWithMedia | null> {
  try {
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      include: { media: true },
    });
    return album;
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
