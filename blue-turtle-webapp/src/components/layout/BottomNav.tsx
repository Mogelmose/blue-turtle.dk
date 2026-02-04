'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Folder, Globe, Home, Plus, User } from 'lucide-react';
import UploadMenu from '@/components/media/UploadMenu';

type NavItem = {
  label: string;
  href?: string;
  icon: typeof Home;
  isPrimary?: boolean;
  isActive?: (pathname: string) => boolean;
  onClick?: () => void;
};

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const safePathname = isMounted ? pathname : '';

  const items: NavItem[] = [
    {
      label: 'Hjem',
      href: '/homepage',
      icon: Home,
      isActive: (path) => path === '/homepage',
    },
    {
      label: 'Albums',
      href: '/albums',
      icon: Folder,
      isActive: (path) => path.startsWith('/albums'),
    },
    {
      label: 'Upload',
      icon: Plus,
      isPrimary: true,
      onClick: () => setIsUploadOpen(true),
    },
    {
      label: 'Kort',
      href: '/geomap',
      icon: Globe,
      isActive: (path) => path === '/geomap',
    },
    {
      label: 'Profil',
      icon: User,
      href: '/profile',
      isActive: (path) => path.startsWith('/profile'),
    },
  ];

  const handleNavigate = useCallback(
    (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      router.push(href);
      if (typeof window === 'undefined') {
        return;
      }
      window.setTimeout(() => {
        if (window.location.pathname !== href) {
          window.location.assign(href);
        }
      }, 300);
    },
    [router],
  );

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-default bg-surface/95 backdrop-blur-sm md:hidden">
        <div className="mx-auto flex max-w-3xl items-stretch px-2">
          {items.map((item) => {
            const isActive = item.isActive ? item.isActive(safePathname) : false;
            const Icon = item.icon;
            const baseClasses =
              'flex flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-semibold transition-colors transition-transform duration-150 ease-out active:scale-[0.95] active:brightness-90';
            const activeClasses = isActive ? 'text-main' : 'text-muted';
            const primaryClasses = item.isPrimary
              ? 'my-2 rounded-full bg-surface-elevated text-main border border-default p-3 transition-transform duration-150 ease-out hover:border-default-hover active:scale-95'
              : '';

            if (!item.href && item.onClick) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className={`${baseClasses} ${activeClasses} ${primaryClasses}`}
                  aria-pressed={item.isPrimary ? isUploadOpen : undefined}
                  aria-current={!item.isPrimary && isActive ? 'page' : undefined}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            }

            if (!item.href) {
              return null;
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={handleNavigate(item.href)}
                className={`${baseClasses} ${activeClasses} ${primaryClasses}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <UploadMenu isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </>
  );
}
