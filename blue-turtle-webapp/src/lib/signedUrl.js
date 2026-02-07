import crypto from 'crypto';

const DEFAULT_EXP_SECONDS = 15 * 60;

function getSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET must be set to sign asset URLs.');
  }
  return secret;
}

function canonicalize(pathname, searchParams) {
  const entries = Array.from(searchParams.entries())
    .filter(([key]) => key !== 'sig' && key !== 'exp')
    .sort(([a], [b]) => a.localeCompare(b));
  const params = new URLSearchParams(entries);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function signCanonical(canonicalPath, exp, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${canonicalPath}|${exp}`)
    .digest('base64url');
}

function withQuery(pathname, searchParams) {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function appendQuery(url, paramsToAdd) {
  const parsed = new URL(url, 'http://local');
  const params = new URLSearchParams(parsed.searchParams);
  Object.entries(paramsToAdd).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  });
  return withQuery(parsed.pathname, params);
}

export function buildSignedUrl(path, options = {}) {
  const { expiresInSeconds = DEFAULT_EXP_SECONDS } = options;
  const secret = getSecret();
  const parsed = new URL(path, 'http://local');
  const params = new URLSearchParams(parsed.searchParams);
  params.delete('sig');
  params.delete('exp');

  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const canonicalPath = canonicalize(parsed.pathname, params);
  const sig = signCanonical(canonicalPath, exp, secret);

  params.set('exp', exp.toString());
  params.set('sig', sig);

  return withQuery(parsed.pathname, params);
}

export function buildSignedMediaUrl(url, mimeType) {
  const normalizedMime = mimeType?.toLowerCase() ?? '';
  const needsJpeg = normalizedMime === 'image/heic' || normalizedMime === 'image/heif';
  const targetUrl = needsJpeg ? appendQuery(url, { format: 'jpeg' }) : url;
  return buildSignedUrl(targetUrl);
}

export function isSignedRequest(request) {
  try {
    const secret = getSecret();
    const url = new URL(request.url);
    const params = new URLSearchParams(url.searchParams);
    const exp = params.get('exp');
    const sig = params.get('sig');
    if (!exp || !sig) {
      return false;
    }

    const expNum = Number(exp);
    if (!Number.isFinite(expNum)) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    if (expNum < now) {
      return false;
    }

    const canonicalPath = canonicalize(url.pathname, params);
    const expected = signCanonical(canonicalPath, expNum, secret);
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(sig);
    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  } catch (error) {
    console.error('Signed URL check failed:', error);
    return false;
  }
}
