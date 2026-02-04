import { Category } from '@prisma/client';
import prisma from '@/lib/prisma';
import type { AlbumSummary } from '@/lib/types/homepage';
import AlbumGroupSection from '@/components/album/AlbumGroupSection';
import CreateAlbumButton from '@/components/album/CreateAlbumButton';
import BottomNav from '@/components/layout/BottomNav';
import Container from '@/components/layout/Container';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';

export const dynamic = 'force-dynamic';

type AlbumWithCategory = AlbumSummary & {
  category: Category;
};

const CATEGORY_LABELS: Record<Category, string> = {
  REJSER: 'Rejser',
  SPILLEAFTEN: 'Spilleaftener',
  JULEFROKOST: 'Julefrokoster',
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
    createdAt: album.createdAt,
    mediaCount: album._count.media,
    category: album.category,
  }));
}

export default async function AlbumsPage() {
  const albums = await getAlbums();

  const grouped = (Object.keys(CATEGORY_LABELS) as Category[]).map(
    (category) => ({
      key: category,
      title: CATEGORY_LABELS[category],
      albums: albums.filter((album) => album.category === category),
    }),
  );

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="flex-1">
        <Container className="w-full py-6 pb-24 md:pb-6">
          <div className="space-y-10">
            <section className="card card-gradient mb-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-main sm:text-4xl">
                    Alle albums
                  </h1>
                  <p className="mt-2 text-sm text-muted">
                    Se alle album, grupperet efter kategori.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-default bg-surface-elevated px-3 py-1 text-xs font-semibold text-main">
                    {albums.length} {albums.length === 1 ? 'album' : 'albums'}
                  </span>
                  <CreateAlbumButton />
                </div>
              </div>
            </section>
            {grouped.map((group) => (
              <AlbumGroupSection
                key={group.key}
                title={group.title}
                albums={group.albums}
              />
            ))}
          </div>
        </Container>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
