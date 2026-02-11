'use client';

import { useEffect, useMemo, useState } from 'react';

type HealthResponse = {
  ok?: boolean;
  checks?: {
    db?: { ok?: boolean; error?: string };
    worker?: {
      ok?: boolean;
      enabled?: boolean;
      error?: string;
      ageMs?: number;
      status?: string | null;
    };
  };
};

type HealthState = 'loading' | 'ok' | 'degraded';

function getState(data: HealthResponse | null): HealthState {
  if (!data) {
    return 'loading';
  }
  return data.ok ? 'ok' : 'degraded';
}

export default function AdminHealthIndicator() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [state, setState] = useState<HealthState>('loading');
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch('/api/health', { cache: 'no-store' });
        const payload = (await response.json()) as HealthResponse;
        if (cancelled) {
          return;
        }
        setData(payload);
        setState(response.ok && payload.ok ? 'ok' : 'degraded');
        setLastCheckedAt(Date.now());
      } catch {
        if (cancelled) {
          return;
        }
        setData(null);
        setState('degraded');
        setLastCheckedAt(Date.now());
      }
    };

    void load();
    const interval = setInterval(() => {
      void load();
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const details = useMemo(() => {
    if (!data?.checks) {
      return 'Sundhedscheck afventer svar.';
    }
    const db = data.checks.db?.ok ? 'DB OK' : `DB fejl: ${data.checks.db?.error ?? 'ukendt fejl'}`;
    const workerEnabled = data.checks.worker?.enabled !== false;
    const worker = workerEnabled
      ? data.checks.worker?.ok
        ? `Worker OK (${data.checks.worker?.status ?? 'running'})`
        : `Worker fejl: ${data.checks.worker?.error ?? 'ukendt fejl'}`
      : 'Worker deaktiveret';
    return `${db}. ${worker}.`;
  }, [data]);

  const derivedState = state === 'loading' ? getState(data) : state;
  const checkedAgo =
    lastCheckedAt === null ? null : `${Math.max(0, Math.floor((now - lastCheckedAt) / 1000))}s siden`;
  const label =
    derivedState === 'ok'
      ? 'System: OK'
      : derivedState === 'loading'
        ? 'System: Tjekker...'
        : 'System: Degraded';
  const className =
    derivedState === 'ok'
      ? 'border-emerald-400 bg-emerald-200/60 text-success shadow-sm dark:border-emerald-500/40 dark:text-emerald-300'
      : derivedState === 'loading'
        ? 'border-sky-400 bg-ocean-200/20 text-sky-900 shadow-sm dark:border-sky-500/40 dark:text-sky-300'
        : 'border-red-400 bg-red-200/60 text-red-900 shadow-sm dark:border-red-500/40 dark:text-red-300';

  return (
    <span
      title={details}
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      {label}
      {checkedAgo ? ` (${checkedAgo})` : ''}
    </span>
  );
}
