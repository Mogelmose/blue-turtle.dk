import NextAuth from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";

const handler = (typeof NextAuth === "function" ? NextAuth : NextAuth?.default)(getAuthOptions());

export { handler as GET, handler as POST };

export const runtime = "nodejs";
