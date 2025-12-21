import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { Album } from "@prisma/client";
import { Plus } from "lucide-react";

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
  <Link 
    href={`/albums/${album.id}`}
    className="card p-0 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
  >
    <div className="aspect-square relative bg-surface-elevated">
      <Image
        src={album.coverImage || "/static/logo.png"}
        alt={album.name}
        fill
        className="object-cover"
      />
    </div>
    <div className="p-3">
      <h3 className="font-semibold text-main truncate">
        {album.name}
      </h3>
    </div>
  </Link>
);

const renderAlbumGrid = (albumList: Album[], title: string) => (
  <section className="mb-12">
    <h2 className="text-2xl font-semibold text-main mb-6">
      {title}
    </h2>
    
    {albumList.length > 0 ? (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {albumList.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    ) : (
      <div className="card text-center py-12">
        <p className="text-muted">Ingen albums i {title} endnu</p>
      </div>
    )}
  </section>
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
    <div className="min-h-screen flex flex-col bg-page">
      <Header />
      {/* Main Content */}
      <main className="flex-1 max-w-full mx-auto w-full px-4 py-8">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-main">Mine Albums</h1>
          <Link href="placeholder" className="btn btn-primary">
            <Plus size={20} />
            <span className="hidden sm:inline">Opret album</span>
          </Link>
        </div>

        {/* Album Categories */}
        <div className="space-y-12">
          {renderAlbumGrid(rejser, "Rejser")}
          {renderAlbumGrid(spilleaftener, "Spilleaftener")}
          {renderAlbumGrid(julefrokoster, "Julefrokoster")}
        </div>
      </main>

      <Footer />
    </div>
  );
}