import { readFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { getSessionVersionHealth } from '@/lib/sessionVersion';
import { sessionAuthOptions as authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WORKER_HEALTH_FILE =
  process.env.WORKER_HEALTH_FILE?.trim() || path.join(os.tmpdir(), 'blue-turtle-worker-health.json');
const WORKER_MAX_AGE_MS = Number(process.env.WORKER_HEARTBEAT_MAX_AGE_MS ?? 20000);
const HEALTH_TOKEN_HEADER = 'x-health-token';

function normalizeToken(value: string): string {
  const trimmed = value.trim();
  const hasDoubleQuotes = trimmed.startsWith('"') && trimmed.endsWith('"');
  const hasSingleQuotes = trimmed.startsWith('\'') && trimmed.endsWith('\'');
  if ((hasDoubleQuotes || hasSingleQuotes) && trimmed.length >= 2) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function safeTokenEquals(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return null;
  }
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    return null;
  }
  return normalizeToken(match[1]);
}

function hasValidHealthToken(request: Request): boolean {
  const expectedTokenRaw = process.env.HEALTHCHECK_TOKEN;
  const expectedToken = expectedTokenRaw ? normalizeToken(expectedTokenRaw) : '';
  if (!expectedToken) {
    return false;
  }

  const providedTokenRaw =
    request.headers.get(HEALTH_TOKEN_HEADER) || getBearerToken(request);
  const providedToken = providedTokenRaw ? normalizeToken(providedTokenRaw) : '';
  if (!providedToken) {
    return false;
  }

  return safeTokenEquals(providedToken, expectedToken);
}

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

export async function GET(request: Request) {
  const tokenAuthorized = hasValidHealthToken(request);
  if (!tokenAuthorized) {
    const session = await getServerSession(authOptions);
    const isAdmin = Boolean(session?.user?.id && session.user.role === 'ADMIN');
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

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
