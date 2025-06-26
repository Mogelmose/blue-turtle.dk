// src/middleware.js
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req) {
  let token = null
  try {
    token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  } catch (error) {
    console.error('Failed to get token:', error);
    // Treat as unauthenticated user
  }
  const { pathname } = req.nextUrl;

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
  matcher: [
    '/((?!api/auth|api/profiles|_next/static|_next/image|uploads/profile|sound|css).*)',
  ],
};
