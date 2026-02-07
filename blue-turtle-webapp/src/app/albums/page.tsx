import { Category } from '@prisma/client';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import type { AlbumSummary } from '@/lib/types/homepage';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
import { buildSignedUrl } from '@/lib/signedUrl';
import AlbumsClient from '@/components/album/AlbumsClient';
import BottomNav from '@/components/layout/BottomNav';
import Container from '@/components/layout/Container';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';

export const dynamic = 'force-dynamic';

type AlbumWithCategory = AlbumSummary & {
  category: Category;
};

async function getAlbums(): Promise<AlbumWithCategory[]> {
  const albums = await prisma.album.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      coverImage: true,
      createdAt: true,
      category: true,
      _count: { select: { media: true } },
    },
  });

  return albums.map((album) => ({
    id: album.id,
    name: album.name,
    coverImage: album.coverImage,
    coverUrl: album.coverImage
      ? buildSignedUrl(`/api/albums/${album.id}/cover`)
      : null,
    createdAt: album.createdAt,
    mediaCount: album._count.media,
    category: album.category,
  }));
}

export default async function AlbumsPage() {
  const albums = await getAlbums();
  const session = await getServerSession(authOptions);
  const isAuthenticated = Boolean(session?.user);

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="flex-1">
        <Container className="w-full py-6 pb-24 md:pb-6">
          <AlbumsClient albums={albums} isAuthenticated={isAuthenticated} />
        </Container>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
