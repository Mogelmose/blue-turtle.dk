"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import CreateAlbumModal from "./CreateAlbumModal";
import ChangePasswordModal from "./ChangePasswordModal";

export default function AppHeader() {
  const { data: session } = useSession();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);

  return (
    <header className="main-header">
      <div className="header-content">
        <div className="header-left">
          <Link href="/homepage" className="logo-link">
            <Image
              src="/static/logo.png"
              alt="Blue Turtle Logo"
              className="logo-image"
              width={100}
              height={100}
              priority
            />
          </Link>
          <h1 className="banner-title">Spilleaften</h1>
        </div>
        <nav className="nav-logud">
          <ul>
            {session && (
              <>
                <li>
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="btn btn-primary"
                  >
                    Opret Album
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setPasswordModalOpen(true)}
                    className="btn btn-primary"
                  >
                    Skift Adgangskode
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="btn btn-primary"
                  >
                    Log ud
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
      <CreateAlbumModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
      />
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </header>
  );
}
