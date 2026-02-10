import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_IMAGE_PATHS = [
  /^\/static\//,
  /^\/api\/users\/[^/]+\/avatar$/,
];
const SIGNED_ASSET_PATHS = [
  /^\/api\/albums\/[^/]+\/cover$/,
  /^\/api\/media\/.+$/,
  /^\/api\/users\/[^/]+\/avatar$/,
];

async function safeGetToken(req: NextRequest) {
  try {
    return await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  } catch (error) {
    console.error('Failed to get token:', error);
    return null;
  }
}

function getImageTargetPath(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url');
  if (!raw) {
    return null;
  }
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  try {
    const url = new URL(decoded, req.nextUrl.origin);
    return url.pathname;
  } catch {
    return null;
  }
}

function isPublicImagePath(pathname: string | null) {
  if (!pathname) {
    return false;
  }
  return PUBLIC_IMAGE_PATHS.some((pattern) => pattern.test(pathname));
}

function isSignedAssetPath(pathname: string) {
  return SIGNED_ASSET_PATHS.some((pattern) => pattern.test(pathname));
}

function hasSignature(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  return params.has('exp') && params.has('sig');
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/api/health') {
    return NextResponse.next();
  }

  if (pathname.startsWith('/_next/image')) {
    const targetPath = getImageTargetPath(req);
    if (isPublicImagePath(targetPath)) {
      return NextResponse.next();
    }
    const token = await safeGetToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/users/') && pathname.endsWith('/avatar')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/') && isSignedAssetPath(pathname) && hasSignature(req)) {
    return NextResponse.next();
  }

  // Allow static assets (images, audio, css) to pass through without auth checks
  if (
    pathname.startsWith('/static/') ||
    pathname.startsWith('/sound/') ||
    pathname.startsWith('/_next/') ||
    /\.(?:png|jpg|jpeg|gif|svg|webp|ico|mp3|css)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = await safeGetToken(req);

  // If user is not authenticated and not on /login, redirect to /login
  if (!token && pathname !== '/login') {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and tries to access /login, redirect to /homepage
  if (token && pathname === '/login') {
    const homeUrl = req.nextUrl.clone();
    homeUrl.pathname = '/homepage';
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|api/profiles|api/health|_next/static).*)'],
};
