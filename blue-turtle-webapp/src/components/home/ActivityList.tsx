import Link from 'next/link';
import { formatDateTime } from '../../lib/date';
import type { ActivityItem } from '../../lib/types/homepage';

type Props = {
  items: ActivityItem[];
};

export default function ActivityList({ items }: Props) {
  return (
    <section id="home-activity" className="space-y-4">
      <h2 className="text-2xl font-semibold text-main">Seneste aktivitet</h2>
      {items.length > 0 ? (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              <Link
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-lg border-2 border-default bg-surface px-4 py-3 transition-transform duration-200 hover:translate-y-0.5 hover:border-default-hover hover:shadow-inner"
              >
                <span className="text-sm font-semibold text-main">
                  {item.label}
                </span>
                <span className="text-xs text-muted">
                  {formatDateTime(item.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card text-center">
          <p className="text-muted">Ingen aktivitet endnu.</p>
        </div>
      )}
    </section>
  );
}
