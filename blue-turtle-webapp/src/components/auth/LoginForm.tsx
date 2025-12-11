import React, { useEffect } from 'react';
import Image from 'next/image';
import { LockClosedIcon, XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

// Define the expected props for the component
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
  // Handle ESC key press
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleGoBack();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [handleGoBack]);

  return (
    <div className="w-full mx-auto max-w-sm md:max-w-md lg:max-w-lg p-5 md:p-8 lg:p-10 bg-light-surface dark:bg-dark-surface rounded-2xl shadow-xl text-center relative">
      <button
        onClick={handleGoBack}
        className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-light-text-muted dark:text-dark-text-muted hover:text-light-primary dark:hover:text-dark-primary transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary rounded-md"
        aria-label="Go back to profile selection"
      >
        <XMarkIcon className="h-6 w-6 md:h-8 md:w-8" />
      </button>

      <div className="flex flex-col items-center mt-4 md:mt-2">
        <div className="relative w-32 h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 2xl:w-48 2xl:h-48 rounded-full overflow-hidden border-4 border-light-border dark:border-dark-border shadow-md">
          <Image
            src={selectedProfile.img}
            alt={`Profilbillede af ${selectedProfile.name}`}
            fill
            className="object-cover"
          />
        </div>
        <p className="mt-4 md:mt-5 lg:mt-6 text-xl md:text-2xl lg:text-3xl font-bold text-light-text dark:text-dark-text">
          {selectedProfile.name}
        </p>
        <p className="mt-1 text-sm md:text-base text-light-text-muted dark:text-dark-text-muted">
          Indtast din adgangskode
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 md:mt-8 lg:mt-10 space-y-4 md:space-y-5">
        <div className="relative">
          <label htmlFor="kode" className="sr-only">
            Adgangskode
          </label>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 md:pl-4">
            <LockClosedIcon className="h-5 w-5 text-light-text-muted dark:text-dark-text-muted" aria-hidden="true" />
          </div>
          <input
            type="password"
            id="kode"
            name="kode"
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            disabled={loading || isBlocked}
            placeholder="Adgangskode"
            required
            className="w-full h-11 md:h-12 lg:h-14 pl-10 md:pl-12 pr-4 text-sm md:text-base text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-lg shadow-sm placeholder:text-light-text-muted dark:placeholder:text-dark-text-muted focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {fejlbesked && (
          <div className="flex items-center gap-2 text-sm md:text-base text-red-700 dark:text-red-300" role="alert">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
            <span>{fejlbesked}</span>
          </div>
        )}

        {succesbesked && (
          <div className="flex items-center gap-2 text-sm md:text-base text-green-700 dark:text-green-300" role="alert">
            <CheckCircleIcon className="h-5 w-5 shrink-0" />
            <span>{succesbesked}</span>
          </div>
        )}

        {isBlocked && (
          <div className="flex items-center gap-2 text-sm md:text-base text-yellow-700 dark:text-yellow-300" role="alert">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
            <span>For mange forkerte forsøg. Prøv igen om 30 sekunder.</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || isBlocked || !kode}
          className="w-full h-11 md:h-12 lg:h-14 flex justify-center items-center px-4 text-sm md:text-base font-semibold text-light-text dark:text-dark-text bg-light-primary hover:bg-light-primary-hover dark:bg-dark-primary dark:hover:bg-dark-primary-hover rounded-lg shadow-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary disabled:bg-opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-light-text dark:text-dark-text"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
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