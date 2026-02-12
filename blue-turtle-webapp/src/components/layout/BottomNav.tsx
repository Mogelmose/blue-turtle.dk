'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

const PRESS_RELEASE_DELAY_MS = 120;
const NAV_FEEDBACK_DELAY_MS = 70;

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(0);
  const [pressedItem, setPressedItem] = useState<string | null>(null);
  const releaseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return undefined;
    }

    const updateOffset = () => {
      const viewport = window.visualViewport;
      if (!viewport) {
        setBottomOffset(0);
        return;
      }

      const offset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      setBottomOffset(offset);
    };

    updateOffset();
    window.visualViewport.addEventListener('resize', updateOffset);
    window.visualViewport.addEventListener('scroll', updateOffset);
    window.addEventListener('orientationchange', updateOffset);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateOffset);
      window.visualViewport?.removeEventListener('scroll', updateOffset);
      window.removeEventListener('orientationchange', updateOffset);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && releaseTimerRef.current !== null) {
        window.clearTimeout(releaseTimerRef.current);
      }
    };
  }, []);

  const safePathname = pathname ?? '';

  const handlePressStart = useCallback((label: string) => {
    if (typeof window !== 'undefined' && releaseTimerRef.current !== null) {
      window.clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
    setPressedItem(label);
  }, []);

  const handlePressEnd = useCallback((delay = PRESS_RELEASE_DELAY_MS) => {
    if (typeof window === 'undefined') {
      setPressedItem(null);
      return;
    }

    if (releaseTimerRef.current !== null) {
      window.clearTimeout(releaseTimerRef.current);
    }

    releaseTimerRef.current = window.setTimeout(() => {
      setPressedItem(null);
      releaseTimerRef.current = null;
    }, delay);
  }, []);

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
    (href: string, label: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      handlePressStart(label);

      const navigate = () => {
        router.push(href);
        if (typeof window === 'undefined') {
          return;
        }
        window.setTimeout(() => {
          if (window.location.pathname !== href) {
            window.location.assign(href);
          }
        }, 300);
      };

      if (typeof window === 'undefined') {
        navigate();
        return;
      }

      window.setTimeout(navigate, NAV_FEEDBACK_DELAY_MS);
      handlePressEnd(PRESS_RELEASE_DELAY_MS + NAV_FEEDBACK_DELAY_MS);
    },
    [router, handlePressStart, handlePressEnd],
  );

  return (
    <>
      <nav
        className="fixed left-0 right-0 z-50 border-t-2 border-default bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
        style={{ bottom: `${bottomOffset}px` }}
      >
        <div className="mx-auto flex max-w-3xl items-stretch px-2">
          {items.map((item) => {
            const isActive = item.isActive ? item.isActive(safePathname) : false;
            const isPressed = pressedItem === item.label;
            const Icon = item.icon;
            const baseClasses = 'flex flex-1 select-none touch-manipulation flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-semibold transition-all duration-150 ease-out active:scale-[0.85] active:opacity-60';
            const activeClasses = isActive ? 'text-primary' : 'text-main';
            const primaryClasses = item.isPrimary
              ? 'my-2 rounded-full bg-surface-elevated text-main border-2 border-default-hover p-3 transition-transform duration-150 ease-out hover:border-default-hover active:scale-95'
              : '';
            const pressedStyle = isPressed
              ? { transform: 'scale(0.85)', opacity: 0.6 }
              : undefined;

            if (!item.href && item.onClick) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    handlePressStart(item.label);
                    item.onClick?.();
                    handlePressEnd();
                  }}
                  onPointerDown={() => handlePressStart(item.label)}
                  onPointerUp={() => handlePressEnd()}
                  onPointerCancel={() => handlePressEnd()}
                  onPointerLeave={() => handlePressEnd()}
                  onTouchStart={() => handlePressStart(item.label)}
                  onTouchEnd={() => handlePressEnd()}
                  onTouchCancel={() => handlePressEnd()}
                  className={`${baseClasses} ${activeClasses} ${primaryClasses}`}
                  style={pressedStyle}
                  aria-pressed={item.isPrimary ? isUploadOpen : undefined}
                  aria-current={!item.isPrimary && isActive ? 'page' : undefined}
                >
                  <Icon size={22} />
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
                onClick={handleNavigate(item.href, item.label)}
                onPointerDown={() => handlePressStart(item.label)}
                onPointerUp={() => handlePressEnd()}
                onPointerCancel={() => handlePressEnd()}
                onPointerLeave={() => handlePressEnd()}
                onTouchStart={() => handlePressStart(item.label)}
                onTouchEnd={() => handlePressEnd()}
                onTouchCancel={() => handlePressEnd()}
                className={`${baseClasses} ${activeClasses} ${primaryClasses}`}
                style={pressedStyle}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={22} />
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
