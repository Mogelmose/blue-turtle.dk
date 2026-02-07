'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

const PING_INTERVAL_MS = 60_000;

export default function PresencePing() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') {
      return undefined;
    }

    let isActive = true;

    const sendPing = async () => {
      if (!isActive) {
        return;
      }
      try {
        await fetch('/api/presence', { method: 'POST' });
      } catch {
        // Best-effort presence update.
      }
    };

    void sendPing();
    const intervalId = window.setInterval(sendPing, PING_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [status]);

  return null;
}
