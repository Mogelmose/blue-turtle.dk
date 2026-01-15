import CredentialsProvider from "next-auth/providers/credentials";
import prisma from './prisma';
import bcrypt from "bcryptjs";

const pages = {
  signIn: "/login",
};

/** @type {import('next-auth').AuthOptions['session']} */
const session = {
  strategy: "jwt",
};

const callbacks = {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.role = user.role;
    }
    return token;
  },
  async session({ session, token }) {
    if (token) {
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
          if (!credentials?.username || !credentials?.password) {
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { username: credentials.username },
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
          };
        },
      }),
    ],
    pages,
    session,
    callbacks,
  };
}

// Minimal options for getServerSession (no providers) — safe during build/config collection
export const sessionAuthOptions = {
  pages,
  session,
  callbacks,
};
