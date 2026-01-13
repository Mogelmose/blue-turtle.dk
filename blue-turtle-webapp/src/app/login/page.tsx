"use client";
import { useEffect, useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import LoginForm from "../../components/auth/LoginForm";
import ProfileSelection from "../../components/auth/ProfileSelection";
import Footer from "../../components/layout/Footer";

// --- Type Definitions ---
interface Profile {
  name: string;
  img: string;
}

interface SelectedProfile extends Profile {}

const logoImage = "/static/logo.png";

// --- Audio Handling ---
const successAudio = typeof Audio !== "undefined" ? new Audio("/sound/pissegodt.mp3") : null;
const playSuccessSound = () => successAudio?.play().catch(console.error);

const errorAudio = typeof Audio !== "undefined" ? new Audio("/sound/snake.mp3") : null;
const playErrorSound = () => errorAudio?.play().catch(console.error);


// --- Main Inner Component ---
function LoginPageInner() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [kode, setKode] = useState("");
  const [fejlbesked, setFejlbesked] = useState("");
  const [succesbesked, setSuccesbesked] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();


  useEffect(() => {
    async function fetchProfiles() {
      try {
        const res = await fetch("/api/profiles");
        if (!res.ok) throw new Error("Network response was not ok");
        const data: Profile[] = await res.json();
        setProfiles(data);
      } catch (error) {
        console.error("Error fetching profiles:", error);
        setFejlbesked("Kunne ikke hente profiler. Prøv at genindlæse siden.");
      }
    }
    fetchProfiles();

    const error = searchParams.get("error");
    if (error === "AccessDenied") {
      setFejlbesked("Adgang nægtet. Du har ikke tilladelse til at se denne side.");
    }
  }, [searchParams]);

  const handleProfileClick = (name: string, img: string) => {
    setSelectedProfile({ name, img });
    setFejlbesked("");
    setSuccesbesked("");
    setKode("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isBlocked || !selectedProfile) return;

    setLoading(true);
    setFejlbesked("");
    setSuccesbesked("");

    const result = await signIn("credentials", {
      redirect: false,
      username: selectedProfile.name,
      password: kode,
    });

    setLoading(false);

    if (result?.ok) {
      setSuccesbesked("Velkommen til Blue Turtle!");
      playSuccessSound();
      setLoginAttempts(0);
      setTimeout(() => {
      router.push("/homepage");
      }, 1200);
    } else {
      setFejlbesked("Forkert adgangskode.");
      playErrorSound();
      setKode("");
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      if (newAttempts >= 3) {
        setIsBlocked(true);
        setTimeout(() => {
          setIsBlocked(false);
          setLoginAttempts(0);
        }, 30000); // 30 seconds
      }
    }
  };

  const handleGoBack = () => {
    setSelectedProfile(null);
    setFejlbesked("");
    setSuccesbesked("");
    setKode("");
    // Clear access denied message when going back
    const error = searchParams.get("error");
    if (error === "AccessDenied") {
        setFejlbesked("");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-page text-main">
      <header className="flex items-center gap-4 p-4 sm:p-6 xl:p-8">
        <Image src={logoImage} alt="Blue Turtle Logo" width={50} height={50} className="full w-fit" />
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Blue Turtle
        </h1>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full">
          {!selectedProfile ? (
            <ProfileSelection 
              profiles={profiles} 
              handleProfileClick={handleProfileClick}
              fejlbesked={fejlbesked}
            />
          ) : (
            <LoginForm
              selectedProfile={selectedProfile}
              kode={kode}
              setKode={setKode}
              handleSubmit={handleSubmit}
              handleGoBack={handleGoBack}
              loading={loading}
              isBlocked={isBlocked}
              fejlbesked={fejlbesked}
              succesbesked={succesbesked}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// --- Suspense Wrapper ---
export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
    </div>
  );
}