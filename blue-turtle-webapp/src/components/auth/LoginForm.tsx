
import React from 'react';
import Image from 'next/image';
import {LockClosedIcon, ArrowLeftIcon, ExclamationTriangleIcon, CheckCircleIcon} from '@heroicons/react/24/solid';

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
  return (
    <div className="w-full max-w-sm p-4 md:p-8 space-y-6 bg-light-surface dark:bg-dark-surface rounded-2xl shadow-xl">
      <button
        onClick={handleGoBack}
        className="flex items-center text-sm font-medium text-light-text-muted dark:text-dark-text-muted hover:text-light-primary dark:hover:text-dark-primary transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary rounded-md"
        aria-label="Go back to profile selection"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-2" />
        Vælg en anden profil
      </button>

      <div className="">
        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-light-border dark:border-dark-border shadow-md">
          <Image
            src={selectedProfile.img}
            alt={`Profilbillede af ${selectedProfile.name}`}
            fill
            className="object-cover"
          />
        </div>
        <p className="mt-4 text-xl font-bold text-light-text dark:text-dark-text">{selectedProfile.name}</p>
        <p className="text-sm text-light-text-muted dark:text-dark-text-muted">Indtast din adgangskode</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <label htmlFor="kode" className="sr-only">Adgangskode</label>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
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
            className="w-full h-12 min-h-12 pl-10 pr-4 text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-lg shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {fejlbesked && (
            <div className="flex items-center p-3 text-sm font-medium text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300 rounded-lg" role="alert">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{fejlbesked}</span>
            </div>
        )}

        {succesbesked && (
            <div className="flex items-center p-3 text-sm font-medium text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 rounded-lg" role="alert">
                <CheckCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{succesbesked}</span>
            </div>
        )}
        
        {isBlocked && (
            <div className="flex items-center p-3 text-sm font-medium text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-lg" role="alert">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>For mange forkerte forsøg. Prøv igen om 30 sekunder.</span>
            </div>
        )}

        <button
          type="submit"
          disabled={loading || isBlocked || !kode}
          className="w-full h-12 min-h-12 flex justify-center items-center px-4 font-semibold text-white bg-light-primary hover:bg-light-primary-hover dark:bg-dark-primary dark:hover:bg-dark-primary-hover rounded-lg shadow-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary disabled:bg-opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : 'Log Ind'}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
