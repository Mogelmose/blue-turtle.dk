"use client";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import "../css/loginstyle.css";
import logoImage from 'public/static/logo.png';

const successAudio = typeof Audio !== "undefined" && new Audio("/sound/pissegodt.mp3");
const playSuccessSound = () =>
  successAudio?.play().catch((err) => console.error("Audio play failed:", err));

const errorAudio = typeof Audio !== "undefined" && new Audio("/sound/snake.mp3");
const playErrorSound = () =>
  errorAudio?.play().catch((err) => console.error("Audio play failed:", err));

export default function LoginPage() {
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
    <div className="body">
      <header className="header">
        <Image
          src={logoImage}
          alt="Logo"
          className="logo-image"
          width={100}
          height={100}
          priority
        />
        <h1 className="banner-title">Spilleaften</h1>
      </header>
      <main className="main">
        <h1>Log venligst ind</h1>
        {!selectedProfile ? (
          <div className="profiles" id="profileSelection">
            {profiles.map((profile) => (
              <div
                className="profile"
                key={profile.name}
                onClick={() => handleProfileClick(profile.name)}
                style={{ cursor: "pointer" }}
              >
                <Image
                  src={profile.img}
                  alt={`Profilbillede af ${profile.name}`}
                  width={200}
                  height={200}
                  className="profile-img"
                  priority
                />
                <div className="profile-name">{profile.name}</div>
              </div>
            ))}
          </div>
        ) : (
          <form id="loginForm" onSubmit={handleSubmit}>
            <label htmlFor="bruger">Bruger</label>
            <input
              type="text"
              id="bruger"
              name="bruger"
              value={selectedProfile}
              readOnly
            />
            <label htmlFor="kode">Adgangskode</label>
            <input
              type="password"
              id="kode"
              name="kode"
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              disabled={loading}
            />
            <p id="fejlbesked" style={{ color: "red", marginTop: 10 }}>
              {fejlbesked}
            </p>
            <p id="succesbesked" style={{ color: "green", marginTop: 10 }}>
              {succesbesked}
            </p>
            <button
              type="submit"
              className="btn btn-primary btn-block"
              style={{ marginTop: "1rem" }}
              disabled={loading}
            >
              Log Ind
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ marginTop: "0.5rem" }}
              onClick={handleGoBack}
              disabled={loading}
            >
              Annuller
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
