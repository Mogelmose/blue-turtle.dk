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
                className="group flex items-center gap-3 rounded-lg border-2 border-default bg-surface px-4 py-2 transition-transform duration-200 hover:translate-y-0.5 hover:border-default-hover hover:shadow-inner"
              >
                <span className="min-w-0 flex-1 text-sm font-semibold text-main">
                  {item.label}
                </span>
                <span
                  className="shrink-0 whitespace-nowrap rounded-xl border-2 border-default px-3 py-1 pt-1 text-xs text-muted tabular-nums transition-colors group-hover:border-default-hover"
                  style={{ WebkitTextSizeAdjust: '100%' }}
                >
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
