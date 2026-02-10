import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
import AdminUsersClient from '@/components/admin/AdminUsersClient';
import BottomNav from '@/components/layout/BottomNav';
import Container from '@/components/layout/Container';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';

type UserRow = {
  id: string;
  username: string;
  role: 'ADMIN' | 'REGULAR';
  isOnline: boolean;
  lastSeenAt: string | null;
};

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (session.user?.role !== 'ADMIN') {
    redirect('/homepage');
  }

  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, lastSeenAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const initialUsers: UserRow[] = users
    .map((user) => ({
      id: user.id,
      username: user.username,
      role: user.role,
      lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
      isOnline: false,
    }))
    .sort((a, b) => {
      return a.username.localeCompare(b.username);
    });

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="flex-1">
        <Container className="w-full py-6 pb-24 md:pb-6">
          <section className="card card-gradient mb-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-main sm:text-4xl">
                  Admin
                </h1>
                <p className="mt-2 text-sm text-muted">
                  Overblik over brugere og aktivitet.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-default bg-surface-elevated px-3 py-1 text-xs font-semibold text-main">
                  {initialUsers.length}{' '}
                  {initialUsers.length === 1 ? 'bruger' : 'brugere'}
                </span>
              </div>
            </div>
          </section>

          <AdminUsersClient initialUsers={initialUsers} />
        </Container>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
