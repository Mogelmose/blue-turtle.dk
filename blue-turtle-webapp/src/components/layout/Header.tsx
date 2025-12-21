// src/components/layout/Header.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { Globe, MoreVertical, X, LogOut } from 'lucide-react';

export default function Header() {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const logoImage = "/static/logo.png";

  return (
    <header className="sticky top-0 z-40 w-full border-b-2 border-default bg-surface/80 backdrop-blur-sm">
      <div className="max-w-full mx-auto flex items-center justify-between h-16 px-4">
        <Link href="/homepage" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Image src={logoImage} alt="Blue Turtle Logo" width={50} height={50} className="full-w-fit" />
          <span className="text-xl sm:text-2xl font-bold tracking-tight">Blue Turtle</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          {session && (
            <>
              <Link 
                href="/geomap" 
                className="p-2 rounded-lg text-main hover:bg-surface-elevated transition-colors"
                title="Kort"
              >
                <Globe size={30} />
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-2 p-2 rounded-lg text-muted hover:text-main hover:bg-surface-elevated transition-colors"
                title="Log ud"
              >
                <LogOut size={26} />
                <span className="sr-only">Log ud</span>
              </button>
            </>
          )}
        </nav>

        {/* Mobile Navigation Trigger */}
        {session && (
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-muted hover:text-main hover:bg-surface-elevated transition-colors"
              aria-label="Main menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <MoreVertical size={24} />}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && session && (
        <div className="md:hidden border-t-2 border-default bg-surface">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link 
              href="/geomap" 
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium text-main hover:bg-surface-elevated transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Globe size={22} />
              <span>Kort</span>
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                signOut({ callbackUrl: '/login' });
              }}
              className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg text-base font-medium text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut size={22} />
              <span>Log ud</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}