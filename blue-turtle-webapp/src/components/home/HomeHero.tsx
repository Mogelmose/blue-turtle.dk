import Link from 'next/link';

type Props = {
  userName: string | null;
  isAdmin: boolean;
};

export default function HomeHero({ userName, isAdmin }: Props) {
  const greeting = userName ? `Hej, ${userName}` : 'Hej';

  return (
    <section className="card">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-3xl font-bold text-main sm:text-4xl">
            {greeting}
          </p>
          <h1 className="mt-2 text-xs font-semibold uppercase tracking-widest text-muted">
            Velkommen til Blue Turtle
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/albums" className="btn btn-primary">
            Alle albums
          </Link>
          <Link href="/geomap" className="btn btn-secondary">
            Kort
          </Link>
          {isAdmin ? (
            <Link href="/admin" className="btn btn-secondary">
              Admin
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
