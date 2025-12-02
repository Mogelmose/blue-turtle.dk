// src/components/album/MediaGallery.jsx
import MediaCard from '../media/MediaCard';

export default function MediaGallery({ media }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-8">
      {media.map((item) => (
        <MediaCard key={item.id} item={item} />
      ))}
    </div>
  );
}