// src/components/album/AlbumGrid.jsx
import AlbumCard from './AlbumCard';

export default function AlbumGrid({ albums, title }) {
  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {albums.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    </div>
  );
}