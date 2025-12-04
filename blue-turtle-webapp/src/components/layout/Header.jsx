// src/components/layout/Header.jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Globe, MoreVertical, X } from 'lucide-react';
import Container from './Container';
import Avatar from '../ui/Avatar';

export default function Header() {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-white-200 backdrop-blur-sm">
      <Container className="flex items-center justify-between h-16">
        <Link href="/homepage" className="flex items-center gap-2">
          <img src="/static/logo.png" alt="Blue Turtle Logo" className="h-8 w-auto" />
          <span className="font-bold text-xl text-gray-800">Spilleaften</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          {session && (
            <>
              <Link href="/geomap" className="text-gray-600 hover:text-gray-900">
                <Globe size={24} />
              </Link>
              {session.user.image && <Avatar src={session.user.image} alt={session.user.name} size="sm" />}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Log ud
              </button>
            </>
          )}
        </nav>

        {/* Mobile Navigation Trigger */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Main menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <MoreVertical size={24} />}
          </button>
        </div>
      </Container>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {session && (
              <>
                <Link href="/geomap" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                  Geomap
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-800 hover:bg-red-50"
                >
                  Log ud
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}