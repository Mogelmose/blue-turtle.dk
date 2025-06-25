import AlbumContent from "./AlbumContent";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

async function getAlbumData(albumId) {
  try {
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      include: { media: true },
    });
    return album;
  } catch (error) {
    console.error("Error fetching album:", error);
    throw error;
  }
}

export default async function AlbumPage({ params }) {
  const { albumId } = await params;
  const albumData = await getAlbumData(albumId);

  if (!albumData) {
    notFound();
  }

  return <AlbumContent initialAlbum={albumData} />;
}
