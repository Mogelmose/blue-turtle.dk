import prisma from './prisma';

let supportsSessionVersionCache;

export function supportsSessionVersion() {
  if (typeof supportsSessionVersionCache === 'boolean') {
    return supportsSessionVersionCache;
  }

  const fields = prisma?._runtimeDataModel?.models?.User?.fields;
  supportsSessionVersionCache =
    Array.isArray(fields) &&
    fields.some((field) => field?.name === 'sessionVersion');

  return supportsSessionVersionCache;
}

function parseBoolean(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export function isSessionVersionRequired() {
  // Default to strict mode. Can be disabled explicitly with REQUIRE_SESSION_VERSION=false.
  const raw = process.env.REQUIRE_SESSION_VERSION;
  if (typeof raw === 'string' && raw.length > 0) {
    return parseBoolean(raw);
  }
  return true;
}

export function assertSessionVersionSupport(context = 'auth/session') {
  const supported = supportsSessionVersion();
  const required = isSessionVersionRequired();

  if (!supported && required) {
    throw new Error(
      `Missing Prisma field User.sessionVersion required by ${context}. Run prisma generate / rebuild image, or set REQUIRE_SESSION_VERSION=false temporarily.`
    );
  }

  return supported;
}

export function getSessionVersionHealth() {
  const supported = supportsSessionVersion();
  const required = isSessionVersionRequired();
  return {
    ok: supported || !required,
    supported,
    required,
    error:
      supported || !required
        ? null
        : 'User.sessionVersion missing in generated Prisma Client.',
  };
}
