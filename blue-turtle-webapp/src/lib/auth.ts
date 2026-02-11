import type { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './prisma';
import { assertSessionVersionSupport } from './sessionVersion';
import {
  buildAuthRateLimitKeys,
  clearAuthFailures,
  getAuthRateLimitDecision,
  recordAuthFailure,
} from './authRateLimit';

const pages: AuthOptions['pages'] = {
  signIn: '/login',
};

const session: AuthOptions['session'] = {
  strategy: 'jwt',
  maxAge: 14 * 24 * 60 * 60,
  updateAge: 60 * 60,
};

const jwt: AuthOptions['jwt'] = {
  maxAge: 14 * 24 * 60 * 60,
};

const callbacks: NonNullable<AuthOptions['callbacks']> = {
  async jwt({ token, user }) {
    assertSessionVersionSupport('NextAuth jwt callback');

    if (user) {
      token.id = user.id;
      token.role = user.role;
      token.sessionVersion = user.sessionVersion ?? 0;
      return token;
    }

    if (!token?.id) {
      return token;
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: token.id },
      select: { role: true, sessionVersion: true },
    });

    if (!dbUser) {
      delete token.id;
      delete token.role;
      token.sessionVersion = 0;
      return token;
    }

    const tokenSessionVersion =
      typeof token.sessionVersion === 'number' ? token.sessionVersion : 0;
    if (tokenSessionVersion !== dbUser.sessionVersion) {
      delete token.id;
      delete token.role;
      token.sessionVersion = dbUser.sessionVersion;
      return token;
    }

    token.role = dbUser.role;
    return token;
  },
  async session({ session, token }) {
    if (token && session?.user) {
      if (!token.id) {
        delete session.user.id;
        delete session.user.role;
        return session;
      }
      session.user.id = token.id;
      session.user.role = token.role;
    }
    return session;
  },
};

export function getAuthOptions(): AuthOptions {
  return {
    providers: [
      CredentialsProvider({
        name: 'Credentials',
        credentials: {
          username: { label: 'Bruger', type: 'text' },
          password: { label: 'Adgangskode', type: 'password' },
        },
        async authorize(credentials, request) {
          assertSessionVersionSupport('NextAuth credentials authorize');

          if (!credentials?.username || !credentials?.password) {
            return null;
          }

          const normalizedUsername = credentials.username.trim().normalize('NFC');
          const rateLimitKeys = buildAuthRateLimitKeys(normalizedUsername, request);
          const rateLimit = getAuthRateLimitDecision(rateLimitKeys);
          if (rateLimit.blocked) {
            return null;
          }

          const user = await prisma.user.findFirst({
            where: {
              username: {
                equals: normalizedUsername,
                mode: 'insensitive',
              },
            },
            select: {
              id: true,
              username: true,
              role: true,
              hashedPassword: true,
              sessionVersion: true,
            },
          });

          if (!user) {
            recordAuthFailure(rateLimitKeys);
            return null;
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.hashedPassword,
          );
          if (!isValidPassword) {
            recordAuthFailure(rateLimitKeys);
            return null;
          }

          clearAuthFailures(rateLimitKeys);

          return {
            id: user.id,
            name: user.username,
            role: user.role,
            sessionVersion: user.sessionVersion ?? 0,
          };
        },
      }),
    ],
    pages,
    session,
    jwt,
    callbacks,
  };
}

// Minimal options for getServerSession (no providers) - safe during build/config collection
export const sessionAuthOptions = {
  pages,
  session,
  jwt,
  callbacks,
} as AuthOptions;
