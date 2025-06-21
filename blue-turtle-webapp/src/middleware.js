// src/middleware.js
import { withAuth } from 'next-auth/middleware';

export default withAuth;

export const config = {
  matcher: [
    '/((?!api/auth|api/profiles|login|_next/static|_next/image|favicon.ico|billeder|sound|css).*)',
  ],
};