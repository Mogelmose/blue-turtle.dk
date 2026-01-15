import type { MediaSummary } from '../../lib/types/homepage';
import HomeMediaTile from './HomeMediaTile';

type Props = {
  items: MediaSummary[];
};

export default function RecentMedia({ items }: Props) {
  return (
    <section id="home-media" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-main">Seneste medier</h2>
        <span className="text-sm text-muted">{items.length} viste</span>
      </div>
      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <HomeMediaTile key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="card text-center">
          <p className="text-muted">Ingen uploads endnu.</p>
        </div>
      )}
    </section>
  );
}
