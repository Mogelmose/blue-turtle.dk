"use client";
import { SessionProvider } from "next-auth/react";
import PresencePing from "@/components/auth/PresencePing";

export default function Providers({ children }) {
  return (
    <SessionProvider 
      // Add these for better performance
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true}
    >
      <PresencePing />
      {children}
    </SessionProvider>
  );
}
