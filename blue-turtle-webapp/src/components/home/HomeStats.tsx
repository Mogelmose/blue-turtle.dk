import { formatShortDate } from '../../lib/date';
import type { HomepageStats } from '../../lib/types/homepage';

type Props = {
  stats: HomepageStats;
};

export default function HomeStats({ stats }: Props) {
  const lastUploadLabel = stats.lastUploadAt
    ? formatShortDate(stats.lastUploadAt)
    : 'Ingen uploads';

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-main">Overblik</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="card card-gradient">
          <p className="text-sm text-muted">Albums</p>
          <p className="mt-2 text-2xl font-semibold text-main">
            {stats.albumCount}
          </p>
        </div>
        <div className="card card-gradient">
          <p className="text-sm text-muted">Medier</p>
          <p className="mt-2 text-2xl font-semibold text-main">
            {stats.mediaCount}
          </p>
        </div>
        <div className="card card-gradient">
          <p className="text-sm text-muted">Seneste upload</p>
          <p className="mt-2 text-2xl font-semibold text-main">
            {lastUploadLabel}
          </p>
        </div>
      </div>
    </section>
  );
}
