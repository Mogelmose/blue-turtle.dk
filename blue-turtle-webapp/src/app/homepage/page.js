import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { sessionAuthOptions as authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import AppHeader from "../components/AppHeader";

async function fetchAlbums() {
  try {
    const albums = await prisma.album.findMany({
      include: {
        media: {
          orderBy: {
            createdAt: "asc",
          },
          take: 1,
        },
      },
    });
    return albums;
  } catch (error) {
    console.error("Error fetching albums:", error);
    return []; // Return an empty array on error
  }
}

export default async function Homepage() {
  const session = await getServerSession(authOptions);
  const albums = await fetchAlbums();

  const renderAlbumGrid = (albumList, title) => (
    <div className="py-8">
      <h1 className="mb-8 text-center text-4xl font-bold text-gray-800">{title}</h1>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {albumList.map((album) => (
          <div key={album.id} className="text-center">
            <Link href={`/albums/${album.id}`} className="group">
              <div className="overflow-hidden rounded-lg border-2 border-primary-500">
                <Image
                  src={album.coverImage || "/static/logo.png"}
                  alt={album.name}
                  width={400}
                  height={400}
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <p className="mt-4 text-lg font-bold text-gray-800">{album.name}</p>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );

  // Filter albums into categories based on the new 'category' field
  const CATEGORY = {
    REJSER: "REJSER",
    SPILLEAFTEN: "SPILLEAFTEN",
    JULEFROKOST: "JULEFROKOST",
  };

  const rejser = albums.filter((album) => album.category === CATEGORY.REJSER);
  const spilleaftener = albums.filter(
    (album) => album.category === CATEGORY.SPILLEAFTEN
  );
  const julefrokoster = albums.filter(
    (album) => album.category === CATEGORY.JULEFROKOST
  );

  return (
    <div className="bg-white text-gray-800">
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <div className="w-full">
          <Image
            src="/static/banner.jpg"
            alt="Banner"
            className="w-full object-cover"
            width={1920}
            height={1080}
            priority
          />
        </div>

        <nav className="bg-white p-4">
          <ul className="flex flex-wrap justify-center gap-4">
            {rejser.map((album) => (
              <li key={album.id}>
                <Link href={`/albums/${album.id}`} className="btn btn-primary">
                  {album.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1 bg-white px-4 py-8 text-black">
          {renderAlbumGrid(spilleaftener, "Spilleaftener")}
          {renderAlbumGrid(julefrokoster, "Julefrokoster")}
        </main>

        <footer className="bg-gray-900 p-4 text-center text-white">
          <p>© 2025 Blue Turtle. Alle rettigheder forbeholdes.</p>
        </footer>
      </div>
    </div>
  );
}