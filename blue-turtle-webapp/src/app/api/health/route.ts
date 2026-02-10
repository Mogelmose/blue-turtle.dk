import { readFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionVersionHealth } from '@/lib/sessionVersion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WORKER_HEALTH_FILE =
  process.env.WORKER_HEALTH_FILE?.trim() || path.join(os.tmpdir(), 'blue-turtle-worker-health.json');
const WORKER_MAX_AGE_MS = Number(process.env.WORKER_HEARTBEAT_MAX_AGE_MS ?? 20000);

function isWorkerEnabled() {
  const configured = process.env.RUN_WORKER;
  if (typeof configured !== 'string' || configured.trim() === '') {
    return process.env.NODE_ENV === 'production';
  }
  const value = configured.toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown DB error';
    return { ok: false, error: message };
  }
}

async function checkWorker() {
  if (!isWorkerEnabled()) {
    return { ok: true, enabled: false };
  }

  try {
    const raw = await readFile(WORKER_HEALTH_FILE, 'utf8');
    const heartbeat = JSON.parse(raw) as {
      updatedAt?: string;
      status?: string;
      activeCount?: number;
      isShuttingDown?: boolean;
    };

    const updatedAt = heartbeat.updatedAt ? new Date(heartbeat.updatedAt) : null;
    if (!updatedAt || Number.isNaN(updatedAt.getTime())) {
      return { ok: false, enabled: true, error: 'Invalid worker heartbeat timestamp.' };
    }

    const ageMs = Date.now() - updatedAt.getTime();
    if (ageMs > WORKER_MAX_AGE_MS) {
      return {
        ok: false,
        enabled: true,
        status: heartbeat.status ?? null,
        activeCount: heartbeat.activeCount ?? null,
        ageMs,
        error: 'Worker heartbeat is stale.',
      };
    }

    return {
      ok: true,
      enabled: true,
      status: heartbeat.status ?? 'running',
      activeCount: heartbeat.activeCount ?? 0,
      isShuttingDown: Boolean(heartbeat.isShuttingDown),
      ageMs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to read worker heartbeat.';
    return { ok: false, enabled: true, error: message };
  }
}

export async function GET() {
  const [db, worker] = await Promise.all([checkDatabase(), checkWorker()]);
  const sessionVersion = getSessionVersionHealth();
  const ok = db.ok && worker.ok && sessionVersion.ok;

  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      checks: { db, worker, sessionVersion },
    },
    { status: ok ? 200 : 503 },
  );
}
