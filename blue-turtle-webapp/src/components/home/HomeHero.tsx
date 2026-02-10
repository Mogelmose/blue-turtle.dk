'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Moon, Sun } from 'lucide-react';

type Props = {
  userName: string | null;
  isAdmin: boolean;
};

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const stored = window.localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  const prefersLight =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  return prefersLight ? 'light' : 'dark';
}

export default function HomeHero({ userName, isAdmin }: Props) {
  const greeting = userName ? `Hej ${userName}` : 'Hej';
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <section className="card card-gradient mb-2 md:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-3xl font-bold text-main sm:text-4xl">
            {greeting}
          </p>
          <h1 className="mt-2 text-xs font-semibold uppercase tracking-widest text-muted">
            Velkommen til Blue Turtle
          </h1>
        </div>
        <div className="flex pt-2 gap-3">
          {isAdmin ? (
            <Link href="/admin" className="btn btn-secondary h-10 w-20">
              Admin
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="relative inline-flex h-10 w-20 items-center rounded-full border-2 border-default bg-surface px-2 transition-colors hover:border-default-hover"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Skift mellem lys og mørk tilstand"
          >
            <span className="sr-only">Skift tema</span>
            <span className="flex w-full items-center justify-between">
              <Sun size={16} className={theme === 'light' ? 'text-primary' : 'text-muted'} />
              <Moon size={16} className={theme === 'dark' ? 'text-primary' : 'text-muted'} />
            </span>
            <span
              className={`absolute h-8 w-8 rounded-full bg-linear-to-br from-blue-800/20 via-sky-200/10 to-blue-200/20 shadow-md backdrop-blur-[1px] ring-1 ring-white/40 transition-transform duration-200 ${
                theme === 'dark' ? 'translate-x-9' : '-translate-x-2'
              }`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </section>
  );
}
