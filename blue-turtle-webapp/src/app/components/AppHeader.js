'use client';

import Link from 'next/link';
import Image from 'next/image';
import { signOut } from 'next-auth/react';

export default function AppHeader({ bannerTitle }) {
  return (
    <header className="main-header">
      <div className="header-content">
        <div className="header-left">
          <Link href="/homepage" className="logo-link">
            <Image
              src="/billeder/logo.png"
              alt="Logo"
              className="logo-image"
              width={100}
              height={100}
              priority
            />
          </Link>
          <h1 className="banner-title">{bannerTitle}</h1>
        </div>
        <nav className="nav-logud">
          <ul>               
            <li>
              <button onClick={() => signOut({ callbackUrl: '/login' })}>
                Log ud
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
