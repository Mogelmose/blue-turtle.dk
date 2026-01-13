import React, { useEffect } from 'react';
import Image from 'next/image';
import { LockClosedIcon, XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

interface LoginFormProps {
  selectedProfile: { name: string; img: string };
  kode: string;
  setKode: (kode: string) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleGoBack: () => void;
  loading: boolean;
  isBlocked: boolean;
  fejlbesked: string;
  succesbesked: string;
}

const LoginForm: React.FC<LoginFormProps> = ({
  selectedProfile,
  kode,
  setKode,
  handleSubmit,
  handleGoBack,
  loading,
  isBlocked,
  fejlbesked,
  succesbesked,
}) => {
  // ESC key to go back
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleGoBack();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [handleGoBack]);

  return (
    <div className="w-full mx-auto max-w-90 md:max-w-md lg:max-w-lg p-4 md:p-6 lg:p-8 card rounded shadow-xl text-center relative">
      <button
        onClick={handleGoBack}
        aria-label="Gå tilbage til profilvalg"
        className="absolute top-4 right-4 md:top-6 md:right-6 p-1 text-main hover:text-muted transition-[transform,color] duration-200 ease-in-out hover:scale-125 active:scale-95"
      >
        <XMarkIcon className="h-7 w-7 md:h-8 md:w-8" />
      </button>

      {/* Profile info */}
      <div className="flex flex-col items-center">
        <div className="relative size-40 md:size-44 lg:size-48 xl:size-52 2xl:size-56 rounded-full overflow-hidden border-4 border-default shadow-md">
          <Image
            src={selectedProfile.img}
            alt={`Profilbillede af ${selectedProfile.name}`}
            fill
            className="object-cover"
          />
        </div>
        <p className="mt-4 md:mt-5 lg:mt-6 text-xl md:text-2xl lg:text-3xl font-bold text-main">
          {selectedProfile.name}
        </p>
        <p className="mt-1 text-sm md:text-base text-muted">Indtast din adgangskode</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-6 md:mt-8 lg:mt-10 space-y-5">
        <div className="relative">
          <label htmlFor="kode" className="sr-only">Adgangskode</label>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 md:pl-4">
            <LockClosedIcon className="h-5 w-5 text-muted" aria-hidden="true" />
          </div>
          <input
            type="password"
            id="kode"
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            disabled={loading || isBlocked}
            placeholder="Adgangskode"
            required
            className="w-full h-11 md:h-12 lg:h-14 pl-10 md:pl-12 pr-4 text-sm md:text-base text-main bg-surface border-2 border-default rounded-lg shadow-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Alerts – fully using .alert-* classes */}
        {fejlbesked && (
          <div className="alert-danger p-3 md:p-4 rounded-lg shadow-sm flex items-center gap-3 text-sm md:text-base font-medium" role="alert">
            <ExclamationTriangleIcon className="h-5 w-5 md:h-6 md:w-6 shrink-0" />
            <span>{fejlbesked}</span>
          </div>
        )}

        {succesbesked && (
          <div className="alert-success p-3 md:p-4 rounded-lg shadow-sm flex items-center gap-3 text-sm md:text-base font-medium" role="alert">
            <CheckCircleIcon className="h-5 w-5 md:h-6 md:w-6 shrink-0" />
            <span>{succesbesked}</span>
          </div>
        )}

        {isBlocked && (
          <div className="alert-warning p-3 md:p-4 rounded-lg shadow-sm flex items-center gap-3 text-sm md:text-base font-medium" role="alert">
            <ExclamationTriangleIcon className="h-5 w-5 md:h-6 md:w-6 shrink-0" />
            <span>For mange forkerte forsøg. Prøv igen om 30 sekunder.</span>
          </div>
        )}

        {/* Submit button – now using the new reusable system */}
        <button
          type="submit"
          disabled={loading || isBlocked || !kode}
          className="btn btn-lg btn-primary w-full justify-center"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Log Ind
            </>
          ) : (
            'Log Ind'
          )}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;