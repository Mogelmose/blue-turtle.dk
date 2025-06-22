import Link from 'next/link';
import Image from 'next/image';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import AppHeader from '../components/AppHeader';
import '../css/homepagestyle.css';

async function fetchAlbums() {
  try {
    const albums = await prisma.album.findMany({
      include: {
        media: {
          orderBy: {
            createdAt: 'asc',
          },
          take: 1,
        },
      },
    });
    return albums;
  } catch (error) {
    console.error('Error fetching albums:', error);
    return []; // Return an empty array on error
  }
}

export default async function Homepage() {
  const session = await getServerSession(authOptions);
  const albums = await fetchAlbums();

  const renderAlbumGrid = (albumList, title) => (
    <div className="event-section">
      <h1 className="event-title">{title}</h1>
      <div className="event-grid">
        {albumList.map((album) => (
          <div className="event" key={album.id}>
            <Link href={`/albums/${album.id}`}>
              <Image
                src={album.coverImage || '/static/fallback.jpg'}
                alt={album.name}
                width={300}
                height={200}
              />
              <p>{album.name}</p>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );

  // Filter albums into categories based on the new 'category' field
  const rejser = albums.filter(album => album.category === 'REJSER');
  const spilleaftener = albums.filter(album => album.category === 'SPILLEAFTEN');
  const julefrokoster = albums.filter(album => album.category === 'JULEFROKOST');

  return (
    <div className="forside-body">
      <div className="page-container">
        <AppHeader />

        <div className="banner-container">
          <Image
            src="/static/banner.jpg"
            alt="Banner"
            className="banner-image"
            width={1600}
            height={600}
            priority
          />
        </div>

        <nav className="nav-bar">
          <ul>
            {rejser.map(album => (
              <li key={album.id}>
                <Link href={`/albums/${album.id}`}>
                  <h2>{album.name}</h2>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main>


          {renderAlbumGrid(spilleaftener, 'Spilleaftener')}
          {renderAlbumGrid(julefrokoster, 'Julefrokoster')}
        </main>

        <footer>
          <p>© 2025 Blue Turtle. Alle rettigheder forbeholdes.</p>
        </footer>
      </div>
    </div>
  );
}