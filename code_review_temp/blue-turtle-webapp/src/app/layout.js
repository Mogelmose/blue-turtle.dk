'use client';
import { SessionProvider } from 'next-auth/react';
import './css/globals.css'; 

export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}