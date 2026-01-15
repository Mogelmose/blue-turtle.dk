import { getServerSession } from 'next-auth';
import { sessionAuthOptions } from '../../lib/auth';
import { getHomepageData } from '../../lib/homepage';
import ActivityList from '../../components/home/ActivityList';
import HomeHero from '../../components/home/HomeHero';
import HomeStats from '../../components/home/HomeStats';
import MapTeaserCard from '../../components/home/MapTeaserCard';
import RecentAlbums from '../../components/home/RecentAlbums';
import RecentMedia from '../../components/home/RecentMedia';
import BottomNav from '../../components/layout/BottomNav';
import Container from '../../components/layout/Container';
import Footer from '../../components/layout/Footer';
import Header from '../../components/layout/Header';

export default async function Homepage() {
  const session = await getServerSession(sessionAuthOptions);
  const data = await getHomepageData();
  const userName = session?.user?.name ?? null;
  const isAdmin = session?.user?.role === 'ADMIN';

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="flex-1">
        <Container className="w-full py-6 pb-24 md:pb-6">
          <div className="space-y-10">
            <HomeHero userName={userName} isAdmin={isAdmin} />
            <RecentAlbums albums={data.recentAlbums} />
            <RecentMedia items={data.recentMedia} />
            <MapTeaserCard mapAlbums={data.mapAlbums} />
            <div className="grid gap-6 lg:grid-cols-2">
              <HomeStats stats={data.stats} />
              <ActivityList items={data.activity} />
            </div>
          </div>
        </Container>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
