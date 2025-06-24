import AlbumContent from './AlbumContent';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';

async function getAlbumData(albumId) {
  const album = await prisma.album.findUnique({
    where: { id: albumId },
    include: { media: true },
  });
  return album;
}

export default async function AlbumPage({ params }) {
  const { albumId } = await params;
  const albumData = await getAlbumData(albumId);

  if (!albumData) {
    notFound();
  }

  return <AlbumContent initialAlbum={albumData} />;
}