import React from 'react';
import Image from 'next/image';

// Define the expected props for the component
interface Profile {
    name: string;
    img: string;
}

interface ProfileSelectionProps {
  profiles: Profile[];
  handleProfileClick: (name: string, img: string) => void;
  fejlbesked: string;
}

const ProfileSelection: React.FC<ProfileSelectionProps> = ({ profiles, handleProfileClick, fejlbesked }) => {
  return (
    <div className="w-full text-center">
      <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-light-text dark:text-dark-text mb-2 md:mb-3 xl:mb-4">Hvem logger ind?</h2>
      <p className="text-lg md:text-xl xl:text-xl text-light-text-muted dark:text-dark-text-muted mb-8 md:mb-10 xl:mb-12">Vælg din profil for at fortsætte.</p>

      {fejlbesked && (
        <div className="mb-6 p-3 text-sm font-medium text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300 rounded-lg" role="alert">
          {fejlbesked}
        </div>
      )}

      {profiles.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 xl:gap-8 justify-items-center">
          {profiles.map((profile) => (
            <div
              key={profile.name}
              onClick={() => handleProfileClick(profile.name, profile.img)}
              className="flex flex-col items-center gap-2 p-3 md:p-6 rounded-2xl bg-light-surface dark:bg-dark-surface hover:bg-light-surface-elevated dark:hover:bg-dark-surface-elevated shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary group"
              style={{ minWidth: '170px', maxWidth: '280px' }}
              tabIndex={0}
              role="button"
              aria-label={`Vælg ${profile.name}`}
            >
              <div className="relative w-32 h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 2xl:w-48 2xl:h-48 rounded-full overflow-hidden border-4 border-light-border dark:border-dark-border group-hover:border-light-primary dark:group-hover:border-dark-primary transition-colors duration-300">
                <Image
                  src={profile.img}
                  alt={`Profilbillede af ${profile.name}`}
                  fill
                  className="object-cover transition-all duration-300"
                />
              </div>
              <span className="font-bold text-base md:text-lg text-light-text dark:text-dark-text text-center wrap-break-words w-full">{profile.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-light-text-muted dark:text-dark-text-muted">Henter profiler...</p>
      )}
    </div>
  );
};

export default ProfileSelection;