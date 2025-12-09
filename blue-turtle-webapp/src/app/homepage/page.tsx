
import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { Album } from "@prisma/client";

async function fetchAlbums() {
  try {
    const albums = await prisma.album.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return albums;
  } catch (error) {
    console.error("Error fetching albums:", error);
    return [];
  }
}

interface AlbumCardProps {
  album: Album;
}

const AlbumCard: React.FC<AlbumCardProps> = ({ album }) => (
  <Link href={`/albums/${album.id}`} className="group block">
    <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200 xl:aspect-w-7 xl:aspect-h-8">
      <Image
        src={album.coverImage || "/static/logo.png"}
        alt={album.name}
        fill
        className="object-cover object-center transition-opacity duration-300 group-hover:opacity-80"
      />
    </div>
    <h3 className="mt-4 text-sm text-gray-700 dark:text-gray-200">{album.name}</h3>
    <p className="mt-1 text-lg font-medium text-gray-900 dark:text-white">{album.infoText}</p>
  </Link>
);

const renderAlbumGrid = (albumList: Album[], title: string) => (
  <div className="py-8">
    <h2 className="text-2xl font-bold tracking-tight text-light-text dark:text-dark-text">{title}</h2>
    <div className="mt-6 grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
      {albumList.map((album) => (
        <AlbumCard key={album.id} album={album} />
      ))}
    </div>
  </div>
);

export default async function Homepage() {
  const session = await getServerSession();
  const albums = await fetchAlbums();

  const CATEGORY = {
    REJSER: "REJSER",
    SPILLEAFTEN: "SPILLEAFTEN",
    JULEFROKOST: "JULEFROKOST",
  };

  const rejser = albums.filter((album) => album.category === CATEGORY.REJSER);
  const spilleaftener = albums.filter((album) => album.category === CATEGORY.SPILLEAFTEN);
  const julefrokoster = albums.filter((album) => album.category === CATEGORY.JULEFROKOST);

  return (
    <div className="bg-light-background dark:bg-dark-background">
      <Header />
      <div className="relative h-64 w-full sm:h-80 md:h-96">
        <Image
          src="/static/banner.jpg"
          alt="Banner"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="my-8">
          <ul className="flex flex-wrap items-center justify-center gap-4">
            {rejser.map((album) => (
              <li key={album.id}>
                <Link 
                  href={`/albums/${album.id}`} 
                  className="px-4 py-2 text-sm font-semibold rounded-full border border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface hover:bg-light-surface-elevated dark:hover:bg-dark-surface-elevated transition-colors"
                >
                  {album.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {renderAlbumGrid(spilleaftener, "Spilleaftener")}
        {renderAlbumGrid(julefrokoster, "Julefrokoster")}
      </main>

      <Footer />
    </div>
  );
}
