'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { MediaSummary } from '../../lib/types/homepage';
import HomeMediaTile from './HomeMediaTile';

type Props = {
  items: MediaSummary[];
};

export default function RecentMedia({ items }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaSummary[]>(items);
  const [prefetchedItems, setPrefetchedItems] = useState<MediaSummary[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(items.length >= 8);
  const hasRequestedRef = useRef(false);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMediaItems(items);
    setPrefetchedItems([]);
    setHasMore(items.length >= 8);
    hasRequestedRef.current = false;
  }, [items]);

  const cappedItems = useMemo(() => mediaItems.slice(0, 24), [mediaItems]);
  const baseItems = useMemo(() => cappedItems.slice(0, 8), [cappedItems]);
  const extraItems = useMemo(() => cappedItems.slice(8), [cappedItems]);
  const hasOverflow = hasMore || prefetchedItems.length > 0 || extraItems.length > 0;

  const fetchMore = useCallback(async (append: boolean) => {
    if (hasRequestedRef.current) {
      return;
    }
    hasRequestedRef.current = true;
    setIsLoadingMore(true);

    try {
      const response = await fetch('/api/media/recent?skip=8&take=16');
      const data = await response.json();
      if (!response.ok || !Array.isArray(data?.items)) {
        throw new Error(data?.error || 'Kunne ikke hente flere medier');
      }

      const incoming = Array.isArray(data.items) ? (data.items as MediaSummary[]) : [];
      if (append) {
        setMediaItems((prev) => {
          const seen = new Set(prev.map((item) => item.id));
          const merged = [...prev];
          for (const item of incoming) {
            if (!seen.has(item.id) && merged.length < 24) {
              seen.add(item.id);
              merged.push(item);
            }
          }
          return merged;
        });
      } else {
        setPrefetchedItems(incoming);
      }

      setHasMore(false);
    } catch (error) {
      console.error('Error fetching more media:', error);
      hasRequestedRef.current = false;
    } finally {
      setIsLoadingMore(false);
    }
  }, []);

  const handleToggleExpanded = useCallback(async () => {
    if (!isExpanded) {
      if (prefetchedItems.length > 0) {
        setMediaItems((prev) => {
          const seen = new Set(prev.map((item) => item.id));
          const merged = [...prev];
          for (const item of prefetchedItems) {
            if (!seen.has(item.id) && merged.length < 24) {
              seen.add(item.id);
              merged.push(item);
            }
          }
          return merged;
        });
        setPrefetchedItems([]);
        setHasMore(false);
      } else if (hasMore) {
        await fetchMore(true);
      }
    }
    setIsExpanded((prev) => !prev);
  }, [fetchMore, hasMore, isExpanded, prefetchedItems]);

  useEffect(() => {
    if (!hasMore) {
      return;
    }
    const slider = sliderRef.current;
    const sentinel = sentinelRef.current;
    if (!slider || !sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void fetchMore(true);
        }
      },
      {
        root: slider,
        rootMargin: '0px 200px 0px 0px',
        threshold: 0.01,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchMore, hasMore]);

  return (
    <section id="home-media" className="space-y-4 mb-2 md:mb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-main">Seneste medier</h2>
        <span className="text-sm text-muted">{cappedItems.length} viste</span>
      </div>
      {cappedItems.length > 0 ? (
        <>
          <div ref={sliderRef} className="flex gap-3 overflow-x-auto pb-0 sm:hidden">
            {cappedItems.map((item) => (
              <HomeMediaTile key={item.id} item={item} />
            ))}
            {hasMore ? (
              <div ref={sentinelRef} className="h-1 w-1 shrink-0" aria-hidden />
            ) : null}
          </div>
          <div className="hidden grid-cols-2 gap-3 sm:grid sm:grid-cols-3 lg:grid-cols-4 mb-3">
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
                onClick={handleToggleExpanded}
                onMouseEnter={() => {
                  if (hasMore) {
                    void fetchMore(false);
                  }
                }}
                onFocus={() => {
                  if (hasMore) {
                    void fetchMore(false);
                  }
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-default bg-surface text-main transition-colors duration-200 hover:border-default-hover hover:bg-surface-elevated"
                aria-expanded={isExpanded}
                disabled={isLoadingMore}
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
