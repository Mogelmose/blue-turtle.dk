// src/components/layout/Header.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { Globe, MoreVertical, X, LogOut } from 'lucide-react';
import Avatar from '../ui/Avatar';

export default function Header() {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const logoImage = "/static/logo.png";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-light-border dark:border-dark-border bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link href="/homepage" className="flex items-center gap-3">
          <Image src={logoImage} alt="Blue Turtle Logo" width={40} height={40} className="rounded-full" />
          <span className="font-bold text-xl text-light-text dark:text-dark-text">Blue Turtle</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          {session && (
            <>
              <Link href="/geomap" className="text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text transition-colors">
                <Globe size={22} />
              </Link>
              {session.user.image && <Avatar src={session.user.image} alt={session.user.name || 'User avatar'} size="sm" />}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-2 text-sm font-medium text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text transition-colors"
                title="Log ud"
              >
                <LogOut size={18} />
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
              className="inline-flex items-center justify-center p-2 rounded-md text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-light-surface-elevated dark:hover:bg-dark-surface-elevated"
              aria-label="Main menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <MoreVertical size={24} />}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && session && (
        <div className="md:hidden border-t border-light-border dark:border-dark-border">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link href="/geomap" className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-light-text dark:text-dark-text hover:bg-light-surface-elevated dark:hover:bg-dark-surface-elevated">
                <Globe size={22} />
                <span>Kort</span>
              </Link>
              {session.user.image && (
                <div className="px-3 py-2">
                   <Avatar src={session.user.image} alt={session.user.name || 'User avatar'} size="sm" />
                </div>
              )}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/50"
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
