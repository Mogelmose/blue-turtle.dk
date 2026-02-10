import CredentialsProvider from "next-auth/providers/credentials";
import prisma from './prisma';
import bcrypt from "bcryptjs";
import { assertSessionVersionSupport } from './sessionVersion';

const pages = {
  signIn: "/login",
};

/** @type {import('next-auth').AuthOptions['session']} */
const session = {
  strategy: "jwt",
  maxAge: 14 * 24 * 60 * 60, // 14 days
  updateAge: 60 * 60, // 1 hour
};

/** @type {import('next-auth').AuthOptions['jwt']} */
const jwt = {
  maxAge: 14 * 24 * 60 * 60, // 14 days
};

const callbacks = {
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

// Build full NextAuth options (evaluates providers) — import only in the auth route
export function getAuthOptions() {
  return {
    providers: [
      (typeof CredentialsProvider === "function" ? CredentialsProvider : CredentialsProvider?.default)({
        name: "Credentials",
        credentials: {
          username: { label: "Bruger", type: "text" },
          password: { label: "Adgangskode", type: "password" },
        },
        async authorize(credentials) {
          assertSessionVersionSupport('NextAuth credentials authorize');

          if (!credentials?.username || !credentials?.password) {
            return null;
          }

          const normalizedUsername = credentials.username.trim().normalize('NFC');

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
            return null;
          }

          const isValidPassword = await bcrypt.compare(credentials.password, user.hashedPassword);
          if (!isValidPassword) {
            return null;
          }

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

// Minimal options for getServerSession (no providers) — safe during build/config collection
export const sessionAuthOptions = {
  pages,
  session,
  jwt,
  callbacks,
};
