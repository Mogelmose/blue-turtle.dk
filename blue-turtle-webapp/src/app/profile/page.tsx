import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { sessionAuthOptions } from '@/lib/auth';
import { formatDateTime } from '@/lib/date';
import prisma from '@/lib/prisma';
import ProfileAvatarEditor from '@/components/profile/ProfileAvatarEditor';
import ProfileSecurityPanel from '@/components/profile/ProfileSecurityPanel';
import BottomNav from '@/components/layout/BottomNav';
import Container from '@/components/layout/Container';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await getServerSession(sessionAuthOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      createdAt: true,
      image: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  const avatarUrl = user.image ? `/api/users/${user.id}/avatar` : '/static/logo.png';
  const createdAtLabel = formatDateTime(user.createdAt);

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="flex-1">
        <Container className="w-full py-6 pb-24 md:pb-6">
          <section className="card space-y-6 max-w-3xl mx-auto">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-main sm:text-4xl sm:pl-4">
                Profil
              </h1>

            </div>
            <div className="grid gap-6">
              <ProfileAvatarEditor
                userId={user.id}
                username={user.username}
                initialAvatarUrl={avatarUrl}
              />
              <dl className="grid gap-4">
                <div>
                  <dt className="text-sm font-semibold text-muted">
                    Brugernavn
                  </dt>
                  <dd className="mt-1 text-xl font-semibold text-main">
                    {user.username}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-muted">
                    Profil Oprettet
                  </dt>
                  <dd className="mt-1 text-xl font-semibold text-main">
                    {createdAtLabel}
                  </dd>
                </div>
              </dl>
              <ProfileSecurityPanel />
            </div>
          </section>
        </Container>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
