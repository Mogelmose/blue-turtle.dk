// src/components/layout/Header.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Folder, Globe, Home, LogOut, Plus, User } from 'lucide-react';
import UploadMenu from '@/components/media/UploadMenu';

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const logoImage = "/static/logo.png";

  const navButtonBase =
    'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors curosor-pointer';
  const navButtonInactive =
    'text-muted hover:bg-[var(--color-ocean-400)]';
  const navButtonActive = 'text-main bg-surface-elevated';
  const navIconHoverActive = 'transition-colors group-hover:text-[var(--nav-hover-active)]';
  const navTextHoverActive = 'transition-colors group-hover:text-[var(--nav-hover-active)]';
  const navIconHoverInactive = 'transition-colors group-hover:text-[var(--nav-hover-inactive)]';
  const navTextHoverInactive = 'transition-colors group-hover:text-[var(--nav-hover-inactive)]';

  const isHomeActive = pathname === '/homepage';
  const isAlbumsActive = !!pathname?.startsWith('/albums');
  const isGeomapActive = pathname === '/geomap';
  const isProfileActive = pathname === '/profile';


  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 w-full border-b-2 border-default bg-surface/95 backdrop-blur-sm">
        <div className="max-w-full mx-auto flex items-center justify-between h-16 px-4">
          <Link
            href="/homepage"
            className="flex items-center gap-3 transition-transform duration-200 hover:scale-[1.03]"
          >
            <Image src={logoImage} alt="Blue Turtle Logo" width={50} height={50} className="full-w-fit" />
            <span className="text-xl sm:text-2xl font-bold tracking-tight">Blue Turtle</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {session && (
              <>
                <Link
                  href="/homepage"
                  className={`${navButtonBase} ${
                    isHomeActive ? navButtonActive : navButtonInactive
                  }`}
                >
                  <Home
                    size={18}
                    className={
                      isHomeActive ? navIconHoverActive : navIconHoverInactive
                    }
                  />
                  <span
                    className={
                      isHomeActive ? navTextHoverActive : navTextHoverInactive
                    }
                  >
                    Hjem
                  </span>
                </Link>
                <Link
                  href="/albums"
                  className={`${navButtonBase} ${
                    isAlbumsActive ? navButtonActive : navButtonInactive
                  }`}
                >
                  <Folder
                    size={18}
                    className={
                      isAlbumsActive ? navIconHoverActive : navIconHoverInactive
                    }
                  />
                  <span
                    className={
                      isAlbumsActive ? navTextHoverActive : navTextHoverInactive
                    }
                  >
                    Albums
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(true)}
                  className={`${navButtonBase} cursor-copy ${
                    isUploadOpen ? navButtonActive : navButtonInactive
                  }`}
                >
                  <Plus
                    size={18}
                    className={isUploadOpen ? navIconHoverActive : navIconHoverInactive}
                  />
                  <span className={isUploadOpen ? navTextHoverActive : navTextHoverInactive}>
                    Upload
                  </span>
                </button>
                <Link
                  href="/geomap"
                  className={`${navButtonBase} ${
                    isGeomapActive ? navButtonActive : navButtonInactive
                  }`}
                >
                  <Globe
                    size={18}
                    className={isGeomapActive ? navIconHoverActive : navIconHoverInactive}
                  />
                  <span
                    className={
                      isGeomapActive ? navTextHoverActive : navTextHoverInactive
                    }
                  >
                    Kort
                  </span>
                </Link>
                <Link
                  href="/profile"
                  className={`${navButtonBase} ${
                    isProfileActive ? navButtonActive : navButtonInactive
                  }`}
                >
                  <User
                    size={18}
                    className={
                      isProfileActive ? navIconHoverActive : navIconHoverInactive
                    }
                  />
                  <span
                    className={
                      isProfileActive ? navTextHoverActive : navTextHoverInactive
                    }
                  >
                    Profil
                  </span>
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className={`${navButtonBase} text-muted cursor-pointer hover:bg-ocean-400`}
                  title="Log ud"
                >
                  <LogOut size={18} className="transition-colors group-hover:text-danger-500" />
                  <span className="transition-colors group-hover:text-danger-500">
                    Log ud
                  </span>
                </button>
              </>
            )}
          </nav>

        </div>
      </header>
      <div className="h-16" aria-hidden />
      <UploadMenu isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </>
  );
}
