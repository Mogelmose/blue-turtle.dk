"use client";
import { useEffect, useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/app/components/Button";
import logoImage from 'public/static/logo.png';

const successAudio = typeof Audio !== "undefined" && new Audio("/sound/pissegodt.mp3");
const playSuccessSound = () =>
  successAudio?.play().catch((err) => console.error("Audio play failed:", err));

const errorAudio = typeof Audio !== "undefined" && new Audio("/sound/snake.mp3");
const playErrorSound = () =>
  errorAudio?.play().catch((err) => console.error("Audio play failed:", err));

function LoginPageInner() {
  const [profiles, setProfiles] = useState([]);
  const [kode, setKode] = useState("");
  const [fejlbesked, setFejlbesked] = useState("");
  const [succesbesked, setSuccesbesked] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const res = await fetch("/api/profiles");
        if (!res.ok) throw new Error("Failed to fetch profiles");
        const data = await res.json();
        setProfiles(data);
      } catch (error) {
        console.error("Error fetching profiles:", error);
        setFejlbesked("Kunne ikke hente profiler");
      }
    }
    fetchProfiles();

    const error = searchParams.get("error");
    if (error === "AccessDenied") {
      setFejlbesked("Adgang nægtet: Kun administratorer kan tilgå denne side.");
    }
  }, [searchParams]);

  const handleProfileClick = (name) => {
    setSelectedProfile(name);
    setFejlbesked("");
    setSuccesbesked("");
    setKode("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBlocked) return;

    setLoading(true);
    setFejlbesked("");
    setSuccesbesked("");
    const result = await signIn("credentials", {
      redirect: false,
      username: selectedProfile,
      password: kode,
    });
    setLoading(false);
    if (result?.ok) {
      setSuccesbesked("Velkommen til Blue Turtle!");
      setFejlbesked("");
      playSuccessSound();
      setLoginAttempts(0);
      setTimeout(() => {
        window.location.href = "/homepage";
      }, 1150);
    } else {
      setFejlbesked("Forkert adgangskode");
      setSuccesbesked("");
      playErrorSound();
      setKode("");
      setLoginAttempts((prev) => {
        const newAttempts = prev + 1;
        if (newAttempts >= 3) {
          setIsBlocked(true);
          const timer = setTimeout(() => {
            setIsBlocked(false);
            setLoginAttempts(0);
          }, 30_000);
        }
        return newAttempts;
      });
    }
  };

  const handleGoBack = () => {
    setSelectedProfile(null);
    setFejlbesked("");
    setSuccesbesked("");
    setKode("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg-dark text-text">
      <header className="flex items-center justify-start gap-4 bg-bg-dark p-4 text-text shadow-md">
        <Image
          src={logoImage}
          alt="Logo"
          className="h-10 w-auto"
          width={100}
          height={100}
          priority
        />
        <h1 className="text-2xl font-bold">Spilleaften</h1>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <h1 className="mb-8 text-3xl font-bold">Log venligst ind</h1>
        {!selectedProfile ? (
          <div id="profileSelection" className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {profiles.map((profile) => (
              <div
                key={profile.name}
                onClick={() => handleProfileClick(profile.name)}
                className="cursor-pointer rounded-lg bg-bg p-4 text-center transition-transform duration-200 hover:scale-105 hover:bg-bg-light"
              >
                <Image
                  src={profile.img}
                  alt={`Profilbillede af ${profile.name}`}
                  width={200}
                  height={200}
                  className="mx-auto mb-4 h-32 w-32 rounded-full object-cover"
                  priority
                />
                <div className="text-lg font-semibold">{profile.name}</div>
              </div>
            ))}
          </div>
        ) : (
          <form id="loginForm" onSubmit={handleSubmit} className="w-full max-w-sm">
            <div className="mb-4">
              <label htmlFor="bruger" className="mb-2 block text-sm font-bold text-text-muted">Bruger</label>
              <input
                type="text"
                id="bruger"
                name="bruger"
                value={selectedProfile}
                readOnly
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="mb-6">
              <label htmlFor="kode" className="mb-2 block text-sm font-bold text-text-muted">Adgangskode</label>
              <input
                type="password"
                id="kode"
                name="kode"
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                disabled={loading}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {fejlbesked && <p className="mb-4 text-center text-danger">{fejlbesked}</p>}
            {succesbesked && <p className="mb-4 text-center text-success">{succesbesked}</p>}
            <Button
              type="submit"
              className="w-full mb-2"
              disabled={loading}
            >
              Log Ind
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handleGoBack}
              disabled={loading}
            >
              Annuller
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
