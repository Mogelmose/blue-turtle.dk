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
      <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-main mb-2 md:mb-3 xl:mb-4">Hvem logger ind?</h2>
      <p className="text-lg md:text-xl xl:text-xl text-muted mb-8 md:mb-10 xl:mb-12">Vælg din profil for at fortsætte.</p>

      {fejlbesked && (
        <div className="mb-6 p-4 rounded-lg alert-danger" role="alert">
          <span className="text-sm font-medium block">{fejlbesked}</span>
        </div>
      )}

      {profiles.length > 0 ? (
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-2 md:gap-2 lg:gap-3 xl:gap-4 justify-center">
            {profiles.map((profile) => (
              <div
                key={profile.name}
                onClick={() => handleProfileClick(profile.name, profile.img)}
                className="flex flex-col items-center gap-1 rounded-2xl card shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                style={{ minWidth: '170px', maxWidth: '280px' }}
                tabIndex={0}
                role="button"
                aria-label={`Vælg ${profile.name}`}
              >
                <div className="relative w-32 h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 2xl:w-48 2xl:h-48 rounded-full overflow-hidden border-4 border-default group-hover:border-default-hover transition-colors duration-300">
                  <Image
                    src={profile.img}
                    alt={`Profilbillede af ${profile.name}`}
                    fill
                    className="object-cover transition-all duration-300 group-hover:scale-105" 
                  />
              </div>
              <span className="font-bold text-base md:text-xl text-main text-center w-full"> {}
                {profile.name}
              </span>
            </div>
          ))}
          </div>
        </div>
      ) : (
        <p className="text-muted">Henter profiler...</p>
      )}
    </div>
  );
};

export default ProfileSelection;