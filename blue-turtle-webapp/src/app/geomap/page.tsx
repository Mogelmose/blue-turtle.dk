import BottomNav from '@/components/layout/BottomNav';
import Container from '@/components/layout/Container';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import GeomapClient from '@/components/geomap/GeomapClient';
import { getGeomapData } from '@/lib/geomap';

export const dynamic = 'force-dynamic';

export default async function GeomapPage() {
  const data = await getGeomapData();
  const albumCount = data.albums.length;
  const mediaCount = data.media.length;

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="flex-1">
        <Container className="w-full py-6 pb-24 md:pb-6">
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
                  <p className="mt-2 text-sm text-muted">
                    Se album lokationer sat manuelt og metadata fra medier.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-default bg-surface-elevated px-3 py-1 text-xs font-semibold text-main">
                    {albumCount} album
                  </span>
                  <span className="rounded-full border border-default bg-surface-elevated px-3 py-1 text-xs font-semibold text-main">
                    {mediaCount} medier
                  </span>
                </div>
              </div>
            </section>

            <GeomapClient albums={data.albums} media={data.media} />
          </div>
        </Container>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
