'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Bell } from 'lucide-react';

type NotificationEvent = {
  id: string;
  type: string;
  message: string;
  albumId?: string | null;
  mediaId?: string | null;
  createdAt: string;
};

type Toast = NotificationEvent & {
  expiresAt: number;
  isClosing: boolean;
  enterDelayMs: number;
};

const MAX_TOASTS = 8;
const MAX_MOBILE_VISIBLE_TOASTS = 3;
const TOAST_DURATION_MS = 8000;
const REFRESH_DEBOUNCE_MS = 1200;
const RECONNECT_DELAY_MS = 2500;
const DISMISS_ANIMATION_MS = 250;
const APPEAR_STAGGER_MS = 220;
const DESKTOP_MEDIA_QUERY = '(min-width: 768px)';

function subscribeIsDesktop(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }

  const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
  const handleChange = () => onStoreChange();
  mediaQuery.addEventListener('change', handleChange);

  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
}

function getIsDesktopSnapshot() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return true;
  }
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

type NotificationToastProps = {
  toast: Toast;
  onDismiss: (toastId: string) => void;
  setRef: (node: HTMLButtonElement | null) => void;
};

function NotificationToast({ toast, onDismiss, setRef }: NotificationToastProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const attachRef = useCallback(
    (node: HTMLButtonElement | null) => {
      buttonRef.current = node;
      setRef(node);
    },
    [setRef],
  );

  useEffect(() => {
    if (toast.isClosing) {
      return;
    }

    const element = buttonRef.current;
    if (!element) {
      return;
    }

    element.style.opacity = '0';
    element.style.transform = 'translateY(-26px) scale(0.94)';
    const animation = element.animate(
      [
        { opacity: 0, transform: 'translateY(-26px) scale(0.94)' },
        { opacity: 1, transform: 'translateY(3px) scale(1.01)', offset: 0.7 },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ],
      {
        duration: 340,
        delay: toast.enterDelayMs,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both',
      },
    );
    animation.onfinish = () => {
      element.style.opacity = '';
      element.style.transform = '';
    };

    return () => {
      animation.onfinish = null;
      animation.cancel();
      element.style.opacity = '';
      element.style.transform = '';
    };
  }, [toast.id, toast.isClosing, toast.enterDelayMs]);

  useEffect(() => {
    if (!toast.isClosing) {
      return;
    }

    const element = buttonRef.current;
    if (!element) {
      return;
    }

    const animation = element.animate(
      [
        { opacity: 1, transform: 'translateY(0) scale(1)' },
        { opacity: 0, transform: 'translateY(-18px) scale(0.96)' },
      ],
      {
        duration: DISMISS_ANIMATION_MS,
        easing: 'ease-in',
        fill: 'forwards',
      },
    );

    return () => {
      animation.cancel();
    };
  }, [toast.isClosing]);

  const handleClick = () => {
    onDismiss(toast.id);
  };

  return (
    <button
      ref={attachRef}
      type="button"
      onClick={handleClick}
      className={[
        'pointer-events-auto w-fit max-w-full self-center rounded-xl border-2 border-default bg-surface px-3 py-2 text-left shadow-lg md:self-start'
      ].join(' ')}
      aria-label="Luk notifikation"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-main">
        <Bell size={14} />
        Opdatering
      </p>
      <p className="mt-1 text-xs text-muted">{toast.message}</p>
    </button>
  );
}

export default function RealtimeEvents() {
  const { status } = useSession();
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const isDesktop = useSyncExternalStore(subscribeIsDesktop, getIsDesktopSnapshot, () => true);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const streamRef = useRef<EventSource | null>(null);
  const toastRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const previousTopByToastIdRef = useRef<Map<string, number>>(new Map());
  const nextAppearTimestampRef = useRef(0);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((prev) =>
      prev.map((item) => {
        if (item.id !== toastId) {
          return item;
        }
        if (item.isClosing) {
          return item;
        }
        return { ...item, isClosing: true };
      }),
    );

    if (dismissTimersRef.current.has(toastId)) {
      return;
    }

    const timerId = setTimeout(() => {
      dismissTimersRef.current.delete(toastId);
      setToasts((prev) => prev.filter((item) => item.id !== toastId));
    }, DISMISS_ANIMATION_MS);
    dismissTimersRef.current.set(toastId, timerId);
  }, []);

  const clearDismissTimers = useCallback(() => {
    for (const timerId of dismissTimersRef.current.values()) {
      clearTimeout(timerId);
    }
    dismissTimersRef.current.clear();
  }, []);

  useLayoutEffect(() => {
    const nextTopByToastId = new Map<string, number>();

    for (const toast of toasts) {
      const element = toastRefs.current[toast.id];
      if (!element) {
        continue;
      }

      const currentTop = element.getBoundingClientRect().top;
      nextTopByToastId.set(toast.id, currentTop);

      const previousTop = previousTopByToastIdRef.current.get(toast.id);
      if (typeof previousTop !== 'number' || toast.isClosing) {
        continue;
      }

      const deltaY = previousTop - currentTop;
      if (Math.abs(deltaY) < 1) {
        continue;
      }

      element.animate(
        [{ transform: `translateY(${deltaY}px)` }, { transform: 'translateY(0)' }],
        {
          duration: 260,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        },
      );
    }

    previousTopByToastIdRef.current = nextTopByToastId;
  }, [toasts]);

  useEffect(() => {
    if (status !== 'authenticated') {
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
      clearDismissTimers();
      return;
    }

    let disposed = false;

    const scheduleReconnect = () => {
      if (disposed || reconnectTimerRef.current) {
        return;
      }
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, RECONNECT_DELAY_MS);
    };

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = setTimeout(() => {
        router.refresh();
      }, REFRESH_DEBOUNCE_MS);
    };

    const connect = () => {
      if (disposed) {
        return;
      }

      streamRef.current?.close();
      const stream = new EventSource('/api/events/stream');
      streamRef.current = stream;

      stream.addEventListener('notification', (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data) as NotificationEvent;
          const now = Date.now();
          const expiresAt = now + TOAST_DURATION_MS;
          const scheduledAt = Math.max(now, nextAppearTimestampRef.current);
          const enterDelayMs = scheduledAt - now;
          nextAppearTimestampRef.current = scheduledAt + APPEAR_STAGGER_MS;
          setToasts((prev) =>
            [{ ...payload, expiresAt, isClosing: false, enterDelayMs }, ...prev]
              .filter((item) => item.expiresAt > now)
              .slice(0, MAX_TOASTS),
          );
          scheduleRefresh();
        } catch {
          // Ignore malformed payloads.
        }
      });

      stream.addEventListener('error', () => {
        stream.close();
        if (streamRef.current === stream) {
          streamRef.current = null;
        }
        scheduleReconnect();
      });
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
      clearDismissTimers();
    };
  }, [status, router, clearDismissTimers]);

  useEffect(() => {
    if (toasts.length === 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      for (const toast of toasts) {
        if (!toast.isClosing && toast.expiresAt <= now) {
          dismissToast(toast.id);
        }
      }
    }, 250);

    return () => clearInterval(timer);
  }, [toasts, dismissToast]);

  if (status !== 'authenticated' || toasts.length === 0) {
    return null;
  }

  const visibleToasts = isDesktop ? toasts : toasts.slice(0, MAX_MOBILE_VISIBLE_TOASTS);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-100 flex justify-center px-3 md:inset-x-auto md:left-4 md:top-18 md:justify-start md:px-0">
      <div className="flex w-full max-w-[min(24rem,calc(100vw-1.5rem))] flex-col gap-2 md:w-72">
        {visibleToasts.map((toast) => (
          <NotificationToast
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
            setRef={(node) => {
              if (node) {
                toastRefs.current[toast.id] = node;
              } else {
                delete toastRefs.current[toast.id];
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
