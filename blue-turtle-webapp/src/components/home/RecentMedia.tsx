'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { MediaSummary } from '../../lib/types/homepage';
import HomeMediaTile from './HomeMediaTile';

type Props = {
  items: MediaSummary[];
};

export default function RecentMedia({ items }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const cappedItems = useMemo(() => items.slice(0, 24), [items]);
  const baseItems = useMemo(() => cappedItems.slice(0, 8), [cappedItems]);
  const extraItems = useMemo(() => cappedItems.slice(8), [cappedItems]);
  const hasOverflow = cappedItems.length > 8;

  return (
    <section id="home-media" className="space-y-4 mb-2 md:mb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-main">Seneste medier</h2>
        <span className="text-sm text-muted">{items.length} viste</span>
      </div>
      {items.length > 0 ? (
        <>
          <div className="flex gap-3 overflow-x-auto pb-0 sm:hidden">
            {cappedItems.map((item) => (
              <HomeMediaTile key={item.id} item={item} />
            ))}
          </div>
          <div className="hidden grid-cols-2 gap-3 sm:grid sm:grid-cols-3 lg:grid-cols-4">
            {baseItems.map((item) => (
              <HomeMediaTile key={item.id} item={item} />
            ))}
          </div>
          {extraItems.length > 0 ? (
            <div
              className={`hidden overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out sm:block ${
                isExpanded
                  ? 'max-h-2499.75 opacity-100 translate-y-0 delay-100'
                  : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'
              }`}
            >
              <div className="mt-0 grid gap-3 pb-3 sm:grid-cols-3 lg:grid-cols-4">
                {extraItems.map((item) => (
                  <HomeMediaTile key={item.id} item={item} />
                ))}
              </div>
            </div>
          ) : null}
          {hasOverflow && (
            <div className="hidden sm:flex justify-center">
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="rounded-full border-2 border-default bg-surface p-2 text-main transition-all duration-200 hover:border-default-hover hover:bg-surface-elevated"
                aria-expanded={isExpanded}
              >
                <span className="sr-only">
                  {isExpanded ? 'Skjul ekstra medier' : 'Vis alle medier'}
                </span>
                <ChevronDown
                  size={20}
                  className={`transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : 'rotate-0'
                  }`}
                  aria-hidden
                />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center">
          <p className="text-muted">Ingen uploads endnu.</p>
        </div>
      )}
    </section>
  );
}
