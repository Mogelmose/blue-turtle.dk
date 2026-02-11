import BottomNav from '@/components/layout/BottomNav';
import Container from '@/components/layout/Container';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import { getGeomapData } from '@/lib/geomap';
import GeomapClientWrapper from '@/components/geomap/GeomapClientWrapper';

export const dynamic = 'force-dynamic';

export default async function GeomapPage() {
  const data = await getGeomapData();
  const albumCount = data.albums.length;
  const mediaWithLocationCount = data.media.length;
  const mediaWithoutLocationCount = Math.max(data.totalMediaCount - mediaWithLocationCount, 0);
  const mediaWithLocationPct =
    data.totalMediaCount > 0
      ? Math.round((mediaWithLocationCount / data.totalMediaCount) * 100)
      : 0;
  const mediaWithoutLocationPct =
    data.totalMediaCount > 0 ? Math.max(100 - mediaWithLocationPct, 0) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="flex-1">
        <Container className="geomap-layout w-full py-6 pb-24 md:pb-6">
          <div className="space-y-6">
            <section className="card card-gradient">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xl sm:text-2xl font-semibold uppercase tracking-[0.3em] text-muted">
                    Geomap
                  </p>
                  <h1 className="mt-2 text-3xl font-bold text-main sm:text-4xl">
                    Se lokationer for albums og medier
                  </h1>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-default bg-surface-elevated px-3 py-1 text-xs font-semibold text-main">
                    {albumCount} album
                  </span>
                  <span className="rounded-full border border-default bg-surface-elevated px-3 py-1 text-xs font-semibold text-main">
                    {mediaWithLocationCount} medier med lokation
                  </span>
                  <span className="rounded-full border border-default bg-surface-elevated px-3 py-1 text-xs font-semibold text-main">
                    {mediaWithoutLocationCount} medier uden lokation
                  </span>
                </div>
              </div>
            </section>

            <GeomapClientWrapper
              albums={data.albums}
              media={data.media}
              totalMediaCount={data.totalMediaCount}
            />
          </div>
        </Container>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
