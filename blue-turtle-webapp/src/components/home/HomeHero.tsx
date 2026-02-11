'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Moon, RefreshCw, Sun } from 'lucide-react';
import { createPortal } from 'react-dom';
import { formatDateTime } from '../../lib/date';

type Props = {
  userName: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
};

type NotificationItem = {
  id: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

const NOTIFICATION_LIST_TAKE = 12;

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const stored = window.localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  const prefersLight =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  return prefersLight ? 'light' : 'dark';
}

export default function HomeHero({ userName, isAdmin, isAuthenticated }: Props) {
  const greeting = userName ? `Hej ${userName}` : 'Hej';
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const [isNotificationsRefreshing, setIsNotificationsRefreshing] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const bellButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const notificationListRef = useRef<HTMLDivElement | null>(null);
  const refreshIconRef = useRef<HTMLSpanElement | null>(null);
  const refreshIconAnimationRef = useRef<Animation | null>(null);
  const [panelPosition, setPanelPosition] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 320,
  });

  const normalizeUnreadCount = useCallback((value: unknown) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, value);
  }, []);

  const updatePanelPosition = useCallback(() => {
    const button = bellButtonRef.current;
    if (!button || typeof window === 'undefined') {
      return;
    }

    const rect = button.getBoundingClientRect();
    const viewportPadding = 8;
    const preferredWidth = 352;
    const width = Math.min(preferredWidth, window.innerWidth - viewportPadding * 2);
    const top = rect.bottom + 8;
    const left = Math.max(
      viewportPadding,
      Math.min(rect.right - width, window.innerWidth - width - viewportPadding),
    );

    setPanelPosition({ top, left, width });
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await fetch('/api/notifications?take=1', { cache: 'no-store' });
      if (!response.ok) {
        setUnreadCount(0);
        return;
      }

      const data = (await response.json()) as { unreadCount?: unknown };
      const nextUnread = normalizeUnreadCount(data.unreadCount);
      setUnreadCount(nextUnread);
    } catch {
      setUnreadCount(0);
    }
  }, [isAuthenticated, normalizeUnreadCount]);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setIsNotificationsLoading(true);
    setNotificationsError(null);

    try {
      const response = await fetch(`/api/notifications?take=${NOTIFICATION_LIST_TAKE}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Kunne ikke hente notifikationer');
      }

      const data = (await response.json()) as {
        items?: NotificationItem[];
        unreadCount?: unknown;
      };

      setNotifications(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(normalizeUnreadCount(data.unreadCount));
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotificationsError('Kunne ikke hente notifikationer.');
    } finally {
      setIsNotificationsLoading(false);
    }
  }, [isAuthenticated, normalizeUnreadCount]);

  const markNotificationsAsRead = useCallback(async () => {
    if (!isAuthenticated || unreadCount === 0) {
      return;
    }

    try {
      const response = await fetch('/api/notifications', { method: 'PATCH' });
      if (!response.ok) {
        return;
      }

      const readAt = new Date().toISOString();
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((item) => (item.readAt ? item : { ...item, readAt })),
      );
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  }, [isAuthenticated, unreadCount]);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void refreshUnreadCount();
    }, 0);

    const interval = window.setInterval(() => {
      void refreshUnreadCount();
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshUnreadCount();
      }
    };

    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshUnreadCount]);

  useEffect(() => {
    return () => {
      refreshIconAnimationRef.current?.cancel();
      refreshIconAnimationRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isNotificationsOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (
        !notificationsRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setIsNotificationsOpen(false);
      }
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (
        !notificationsRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setIsNotificationsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    updatePanelPosition();

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [isNotificationsOpen, updatePanelPosition]);

  useEffect(() => {
    if (!isNotificationsOpen) {
      return;
    }

    const listElement = notificationListRef.current;
    if (!listElement) {
      return;
    }

    let lastTouchY = 0;

    const handleTouchStart = (event: TouchEvent) => {
      lastTouchY = event.touches[0]?.clientY ?? 0;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (listElement.scrollHeight <= listElement.clientHeight) {
        return;
      }

      const currentY = event.touches[0]?.clientY ?? lastTouchY;
      const deltaY = currentY - lastTouchY;
      lastTouchY = currentY;

      const atTop = listElement.scrollTop <= 0;
      const atBottom =
        Math.ceil(listElement.scrollTop + listElement.clientHeight) >= listElement.scrollHeight;
      const movingDown = deltaY > 0;
      const movingUp = deltaY < 0;

      if ((atTop && movingDown) || (atBottom && movingUp)) {
        event.preventDefault();
      }
    };

    listElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    listElement.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      listElement.removeEventListener('touchstart', handleTouchStart);
      listElement.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isNotificationsOpen]);

  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  const handleBellClick = () => {
    const nextOpen = !isNotificationsOpen;
    setIsNotificationsOpen(nextOpen);

    if (!nextOpen) {
      return;
    }

    updatePanelPosition();
    void refreshNotifications();
    void markNotificationsAsRead();
  };

  const handleRefreshNotificationsClick = async () => {
    const iconElement = refreshIconRef.current;
    if (iconElement) {
      refreshIconAnimationRef.current?.cancel();
      refreshIconAnimationRef.current = iconElement.animate(
        [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(360deg)' },
        ],
        {
          duration: 500,
          easing: 'linear',
          fill: 'none',
        },
      );
    }

    if (isNotificationsRefreshing) {
      return;
    }

    setIsNotificationsRefreshing(true);
    try {
      await refreshNotifications();
    } finally {
      setIsNotificationsRefreshing(false);
    }
  };

  const notificationPanel = isNotificationsOpen ? (
    <div
      ref={panelRef}
      id="home-notifications-panel"
      className="fixed z-200 overflow-hidden rounded-xl border-2 border-default bg-surface shadow-lg"
      style={{
        top: `${panelPosition.top}px`,
        left: `${panelPosition.left}px`,
        width: `${panelPosition.width}px`,
      }}
    >
      <div className="flex items-center justify-between border-b-2 border-default px-3 py-2">
        <p className="text-sm font-semibold text-main">Seneste notifikationer</p>
        <button
          type="button"
          onClick={() => {
            void handleRefreshNotificationsClick();
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-main transition-colors hover:bg-surface-elevated hover:text-main disabled:opacity-60"
          aria-label="Opdater notifikationer"
          title="Opdater notifikationer"
          disabled={isNotificationsRefreshing}
        >
          <span ref={refreshIconRef} className="inline-flex">
            <RefreshCw size={18} />
          </span>
        </button>
      </div>
      <div
        ref={notificationListRef}
        className="p-2 touch-pan-y scrollbar-subtle scrollbar-gutter-stable"
        style={{
          height: '20rem',
          maxHeight: '70svh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {isNotificationsLoading ? (
          <p className="px-2 py-3 text-base text-muted">Henter notifikationer...</p>
        ) : notificationsError ? (
          <p className="px-2 py-3 text-sm text-danger">{notificationsError}</p>
        ) : notifications.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted">Ingen notifikationer endnu.</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((item) => {
              const createdAt = new Date(item.createdAt);
              const createdAtLabel = Number.isNaN(createdAt.getTime())
                ? item.createdAt
                : formatDateTime(createdAt);

              return (
                <li
                  key={item.id}
                  className="rounded-xl border-2 border-default card-gradient px-3 py-2 shadow-lg"
                >
                  <p className="text-xs text-muted">{createdAtLabel}</p>
                  <p className="mt-1 text-sm text-main">{item.message}</p>
                  {!item.readAt ? (
                    <p className="mt-1 text-[11px] font-semibold text-primary">Ulæst</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  ) : null;

  return (
    <section className="card card-gradient mb-2 md:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-3xl font-bold text-main sm:text-4xl">
            {greeting}
          </p>
          <h1 className="mt-2 text-xs font-semibold uppercase tracking-widest text-muted">
            Velkommen til Blue Turtle
          </h1>
        </div>
        <div className="flex pt-2 gap-3">
          {isAdmin ? (
            <Link href="/admin" className="btn btn-secondary h-10 w-20">
              Admin
            </Link>
          ) : null}
          <div ref={notificationsRef} className="relative">
            <button
              ref={bellButtonRef}
              type="button"
              onClick={handleBellClick}
              className="relative inline-flex h-10 w-10 min-h-10 min-w-10 aspect-square shrink-0 items-center justify-center rounded-full border-2 border-default bg-surface transition-colors hover:border-default-hover"
              aria-label={`Notifikationer${unreadCount > 0 ? ` (${unreadCount} ulæste)` : ''}`}
              aria-expanded={isNotificationsOpen}
              aria-controls="home-notifications-panel"
              title="Notifikationer"
            >
              <Bell size={16} className={unreadCount > 0 ? 'text-primary' : 'text-muted'} />
              {unreadCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 min-w-[1.15rem] rounded-full border border-default bg-surface-elevated px-1 text-[10px] font-semibold leading-4 text-main">
                  {unreadLabel}
                </span>
              ) : null}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="relative inline-flex h-10 w-20 items-center rounded-full border-2 border-default bg-surface px-2 transition-colors hover:border-default-hover"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Skift mellem lys og mørk tilstand"
          >
            <span className="sr-only">Skift tema</span>
            <span className="flex w-full items-center justify-between">
              <Sun size={16} className={theme === 'light' ? 'text-primary' : 'text-muted'} />
              <Moon size={16} className={theme === 'dark' ? 'text-primary' : 'text-muted'} />
            </span>
            <span
              className={`absolute h-8 w-8 rounded-full bg-linear-to-br from-blue-800/20 via-sky-200/10 to-blue-200/20 shadow-md backdrop-blur-[1px] ring-1 ring-white/40 transition-transform duration-200 ${
                theme === 'dark' ? 'translate-x-9' : '-translate-x-2'
              }`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
      {typeof document !== 'undefined' && notificationPanel
        ? createPortal(notificationPanel, document.body)
        : null}
    </section>
  );
}
