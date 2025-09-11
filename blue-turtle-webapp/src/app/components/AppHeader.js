"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import CreateAlbumModal from "./CreateAlbumModal";
import ChangePasswordModal from "./ChangePasswordModal";
import { Globe } from "lucide-react";
import { MoreVertical } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

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
        <nav className="nav-menu">
          <ul>
            {session && (
              <>
                {/* Geomap icon (ghost button) visible only when authenticated */}
                <li>
                  <Link
                    href="/geomap"
                    aria-label="Geomap"
                    className="icon-btn ghost"
                    title="Geomap"
                    style={{ minHeight: '48px', minWidth: '48px' }}
                  >
                    <Globe size={27.5} strokeWidth={2} aria-hidden />
                  </Link>
                </li>
                {/* Dropdown menu for account/actions */}
                <li>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button
                        className="inline-flex h-12 w-12 items-center justify-center rounded-md text-gray-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                        aria-label="Menu"
                        title="Menu"
                        type="button"
                      >
                        <MoreVertical size={30} strokeWidth={2} aria-hidden />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        side="bottom"
                        align="end"
                        alignOffset={-20}
                        sideOffset={5}
                        className="z-50 min-w-[12rem] rounded-md border border-white/10 bg-gray-950 p-2 text-gray-200 shadow-lg backdrop-blur-sm"
                      >
                        <DropdownMenu.Item
                          className="relative flex cursor-default select-none items-center rounded-sm px-10 py-10 text-xl outline-none hover:bg-white/10 focus:bg-white/10"
                          onSelect={(e) => {
                            e.preventDefault();
                            setModalOpen(true);
                          }}
                        >
                          Opret Album
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          className="relative flex cursor-default select-none items-center rounded-sm px-10 py-10 text-xl outline-none hover:bg-white/10 focus:bg-white/10"
                          onSelect={(e) => {
                            e.preventDefault();
                            setPasswordModalOpen(true);
                          }}
                        >
                          Skift Adgangskode
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="my-2 h-px bg-white/10" />
                        <DropdownMenu.Item
                          className="relative flex cursor-default select-none items-center rounded-sm px-10 py-10 text-xl text-red-300 outline-none hover:bg-white/10 focus:bg-white/10"
                          onSelect={() => signOut({ callbackUrl: "/login" })}
                        >
                          Log ud
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
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
