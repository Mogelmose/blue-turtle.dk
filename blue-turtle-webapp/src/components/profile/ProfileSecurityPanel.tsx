'use client';

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { signOut } from 'next-auth/react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';

type FormState = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

const INITIAL_STATE: FormState = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
};

export default function ProfileSecurityPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorSoundRef = useRef<HTMLAudioElement | null>(null);

  const playErrorSound = () => {
    const audio = errorSoundRef.current;
    if (!audio) {
      return;
    }

    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => undefined);
    }
  };

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setSuccess(null);
    }, 10000);

    return () => clearTimeout(timer);
  }, [success]);

  const handleOpen = () => {
    setError(null);
    setSuccess(null);
    setForm(INITIAL_STATE);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setSuccess(null);
    setForm(INITIAL_STATE);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.currentPassword || !form.newPassword || !form.confirmNewPassword) {
      setError('Udfyld alle felter.');
      playErrorSound();
      return;
    }

    if (form.newPassword !== form.confirmNewPassword) {
      setError('Adgangskoderne er ikke ens.');
      playErrorSound();
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/password-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error || 'Kunne ikke ændre adgangskode.');
        playErrorSound();
        return;
      }

      setForm(INITIAL_STATE);
      setSuccess(payload?.message || 'Adgangskode opdateret.');
      setTimeout(() => {
        signOut({ callbackUrl: '/login' });
      }, 1200);
    } catch (submitError) {
      console.error('Password change failed:', submitError);
      setError('Kunne ikke ændre adgangskode. Prøv igen.');
      playErrorSound();
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordChecks = [
    {
      label: 'Mindst 12 tegn',
      passed: form.newPassword.length >= 12,
    },
    {
      label: 'Mindst ét stort bogstav',
      passed: /[A-Z]/.test(form.newPassword),
    },
    {
      label: 'Mindst ét lille bogstav',
      passed: /[a-z]/.test(form.newPassword),
    },
    {
      label: 'Mindst ét tal',
      passed: /[0-9]/.test(form.newPassword),
    },
    {
      label: 'Mindst ét specialtegn',
      passed: /[^A-Za-z0-9]/.test(form.newPassword),
    },
    {
      label: 'Adgangskoderne er ens',
      passed:
        form.newPassword.length > 0 &&
        form.newPassword === form.confirmNewPassword,
    },
  ];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const scrollY = window.scrollY;
    const originalStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.position = originalStyles.position;
      document.body.style.top = originalStyles.top;
      document.body.style.left = originalStyles.left;
      document.body.style.right = originalStyles.right;
      document.body.style.width = originalStyles.width;
      document.body.style.overflow = originalStyles.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  return (
    <div className="space-y-2">
      <audio
        ref={errorSoundRef}
        src="/sound/b.mp3"
        preload="auto"
        aria-hidden="true"
        className="sr-only"
      />
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleOpen}
            className="btn btn-primary btn-sm w-auto sm:w-auto"
          >
            Skift adgangskode
          </button>
        </div>
      </section>

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="btn btn-danger btn-sm w-auto sm:w-auto"
      >
        Log ud
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />
          <div
            className="relative w-full max-w-2xl card max-h-[85svh] sm:max-h-[85vh] overflow-y-auto overscroll-contain touch-pan-y"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 text-sm font-medium text-main hover:text-muted transition-[transform,color] duration-200 ease-in-out hover:scale-125 active:scale-95"
            >
              <span className="sr-only">Luk</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <form
              onSubmit={handleSubmit}
              className="space-y-3 sm:space-y-4 pb-2 sm:pb-0"
              suppressHydrationWarning
            >
              <div className="grid gap-4">
                <div>
                  <label htmlFor="currentPassword" className="label">
                    Nuværende adgangskode
                  </label>
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    value={form.currentPassword}
                    onChange={handleChange}
                    className="input"
                    disabled={isSubmitting}
                    required
                    suppressHydrationWarning
                  />
                </div>
                <div>
                  <label htmlFor="newPassword" className="label">
                    Ny adgangskode
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={form.newPassword}
                    onChange={handleChange}
                    className="input"
                    disabled={isSubmitting}
                    required
                    suppressHydrationWarning
                  />
                </div>
                <div className="col-span-1">
                  <label htmlFor="confirmNewPassword" className="label">
                    Bekræft ny adgangskode
                  </label>
                  <input
                    id="confirmNewPassword"
                    name="confirmNewPassword"
                    type="password"
                    autoComplete="new-password"
                    value={form.confirmNewPassword}
                    onChange={handleChange}
                    className="input"
                    disabled={isSubmitting}
                    required
                    suppressHydrationWarning
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-muted sm:grid-cols-2">
                {passwordChecks.map((check) => (
                  <div key={check.label} className="flex items-center gap-2">
                    {check.passed ? (
                      <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-danger" />
                    )}
                    <span className={check.passed ? 'text-success' : 'text-danger'}>
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="h-12">
                {error && (
                  <div
                    className="alert-danger animate-status-in rounded-lg p-2 shadow-sm flex items-center gap-2 text-xs font-semibold"
                    role="alert"
                  >
                    <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {success && !error && (
                  <div
                    className="alert-success animate-status-toast rounded-lg p-2 shadow-sm flex items-center gap-2 text-xs font-semibold"
                    role="status"
                    aria-live="polite"
                  >
                    <CheckCircleIcon className="h-4 w-4 shrink-0" />
                    <span>{success}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  <span>Ved succesfuldt adgangskodeskift bliver du logget ud.</span>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Gemmer...' : 'Opdater adgangskode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
