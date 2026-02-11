const MAX_ATTEMPTS = 3;
const WINDOW_MS = 2 * 60 * 1000;
const BLOCK_MS = 5 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;
const STALE_ENTRY_MS = 60 * 60 * 1000;

type RateLimitEntry = {
  count: number;
  windowStartAt: number;
  blockedUntil: number;
  lastSeenAt: number;
};

type RateLimitDecision = {
  blocked: boolean;
  retryAfterSeconds: number;
};

const attempts = new Map<string, RateLimitEntry>();
let lastCleanupAt = 0;

function readHeader(headersValue: unknown, key: string): string | null {
  if (!headersValue) {
    return null;
  }

  if (headersValue instanceof Headers) {
    const value = headersValue.get(key);
    return value ? value.trim() : null;
  }

  if (typeof headersValue === 'object') {
    const headersRecord = headersValue as Record<string, unknown>;
    const raw =
      headersRecord[key] ??
      headersRecord[key.toLowerCase()] ??
      headersRecord[key.toUpperCase()];

    if (Array.isArray(raw)) {
      const first = raw.find((value) => typeof value === 'string');
      return typeof first === 'string' ? first.trim() : null;
    }

    return typeof raw === 'string' ? raw.trim() : null;
  }

  return null;
}

function extractClientIp(request: unknown): string {
  if (!request || typeof request !== 'object') {
    return 'unknown';
  }

  const requestRecord = request as Record<string, unknown>;
  const headers = requestRecord.headers;
  const forwardedFor = readHeader(headers, 'x-forwarded-for');
  if (forwardedFor) {
    const [first] = forwardedFor.split(',');
    const ip = first?.trim();
    if (ip) {
      return ip;
    }
  }

  const realIp = readHeader(headers, 'x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

function normalizeUsername(username: string): string {
  return username.trim().normalize('NFC').toLowerCase();
}

function maybeCleanup(now: number) {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupAt = now;
  for (const [key, entry] of attempts.entries()) {
    if (
      now - entry.lastSeenAt > STALE_ENTRY_MS &&
      (entry.blockedUntil === 0 || entry.blockedUntil < now)
    ) {
      attempts.delete(key);
    }
  }
}

function upsertEntry(key: string, now: number): RateLimitEntry {
  const existing = attempts.get(key);
  if (existing) {
    existing.lastSeenAt = now;
    return existing;
  }

  const created: RateLimitEntry = {
    count: 0,
    windowStartAt: now,
    blockedUntil: 0,
    lastSeenAt: now,
  };
  attempts.set(key, created);
  return created;
}

function getDecisionForKey(key: string, now: number): RateLimitDecision {
  const entry = attempts.get(key);
  if (!entry) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  if (entry.blockedUntil > now) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((entry.blockedUntil - now) / 1000),
    );
    return { blocked: true, retryAfterSeconds };
  }

  if (entry.windowStartAt + WINDOW_MS <= now) {
    entry.count = 0;
    entry.windowStartAt = now;
    entry.blockedUntil = 0;
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

function recordFailureForKey(key: string, now: number) {
  const entry = upsertEntry(key, now);

  if (entry.windowStartAt + WINDOW_MS <= now) {
    entry.count = 0;
    entry.windowStartAt = now;
    entry.blockedUntil = 0;
  }

  entry.count += 1;
  entry.lastSeenAt = now;

  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS;
  }
}

export function buildAuthRateLimitKeys(username: string, request: unknown): string[] {
  const normalizedUsername = normalizeUsername(username);
  const ip = extractClientIp(request);

  return [
    `user:${normalizedUsername}`,
    `user-ip:${normalizedUsername}:${ip}`,
  ];
}

export function getAuthRateLimitDecision(keys: string[]): RateLimitDecision {
  const now = Date.now();
  maybeCleanup(now);

  let retryAfterSeconds = 0;

  for (const key of keys) {
    const decision = getDecisionForKey(key, now);
    if (decision.blocked) {
      retryAfterSeconds = Math.max(retryAfterSeconds, decision.retryAfterSeconds);
    }
  }

  return {
    blocked: retryAfterSeconds > 0,
    retryAfterSeconds,
  };
}

export function recordAuthFailure(keys: string[]) {
  const now = Date.now();
  maybeCleanup(now);

  for (const key of keys) {
    recordFailureForKey(key, now);
  }
}

export function clearAuthFailures(keys: string[]) {
  for (const key of keys) {
    attempts.delete(key);
  }
}
