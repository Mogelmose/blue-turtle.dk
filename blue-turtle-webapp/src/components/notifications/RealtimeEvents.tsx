'use client';

import { useEffect, useRef, useState } from 'react';
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
};

const MAX_TOASTS = 3;
const TOAST_DURATION_MS = 6000;
const REFRESH_DEBOUNCE_MS = 1200;
const RECONNECT_DELAY_MS = 2500;

export default function RealtimeEvents() {
  const { status } = useSession();
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') {
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
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
          const expiresAt = Date.now() + TOAST_DURATION_MS;
          setToasts((prev) =>
            [...prev, { ...payload, expiresAt }]
              .slice(-MAX_TOASTS)
              .filter((item) => item.expiresAt > Date.now()),
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
    };
  }, [status, router]);

  useEffect(() => {
    if (toasts.length === 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      setToasts((prev) => prev.filter((item) => item.expiresAt > now));
    }, 500);

    return () => clearInterval(timer);
  }, [toasts.length]);

  if (status !== 'authenticated' || toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-100 flex w-[min(26rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto rounded-lg border border-default bg-surface-elevated px-3 py-2 shadow-lg"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-main">
            <Bell size={14} />
            Opdatering
          </p>
          <p className="mt-1 text-xs text-muted">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}
