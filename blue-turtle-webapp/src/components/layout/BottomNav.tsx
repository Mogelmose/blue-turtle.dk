'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Folder, Globe, Home, Plus, User } from 'lucide-react';

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
  isPrimary?: boolean;
  isActive?: (pathname: string) => boolean;
};

export default function BottomNav() {
  const pathname = usePathname();

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
      href: '/albums',
      icon: Plus,
      isPrimary: true,
    },
    {
      label: 'Kort',
      href: '/geomap',
      icon: Globe,
      isActive: (path) => path === '/geomap',
    },
    { label: 'Aktivitet', href: '/homepage#home-activity', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-default bg-surface/95 backdrop-blur-sm md:hidden">
      <div className="mx-auto flex max-w-3xl items-stretch px-2">
        {items.map((item) => {
          const isActive = item.isActive ? item.isActive(pathname) : false;
          const Icon = item.icon;
          const baseClasses =
            'flex flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-semibold transition-colors';
          const activeClasses = isActive ? 'text-main' : 'text-muted';
          const primaryClasses = item.isPrimary
            ? 'my-2 rounded-full bg-primary text-white shadow'
            : '';

          return (
            <Link
              key={item.label}
              href={item.href}
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
  );
}
