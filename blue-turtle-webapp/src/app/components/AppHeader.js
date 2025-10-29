"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import CreateAlbumModal from "./CreateAlbumModal";
import ChangePasswordModal from "./ChangePasswordModal";
import ThemeToggle from "./ThemeToggle";
import { Globe } from "lucide-react";
import { MoreVertical } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export default function AppHeader() {
  const { data: session } = useSession();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);

  return (
    <header class="bg-gray-900 text-white shadow-md">
      <div class="container mx-auto flex h-header items-center justify-between px-2 sm:px-4">
        <div class="flex items-center gap-2 sm:gap-4">
          <Link href="/homepage" class="flex items-center gap-2">
            <Image
              src="/static/logo.png"
              alt="Blue Turtle Logo"
              class="h-8 w-auto sm:h-10"
              width={100}
              height={100}
              priority
            />
          </Link>
          <h1 class="text-xl font-bold sm:text-2xl">Spilleaften</h1>
        </div>
        <nav class="flex items-center gap-2 sm:gap-4">
          {session && (
            <>
              <Link
                href="/geomap"
                aria-label="Geomap"
                class="flex h-12 w-12 items-center justify-center rounded-md text-gray-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                title="Geomap"
              >
                <Globe size={28} strokeWidth={2} aria-hidden />
              </Link>
              <ThemeToggle />
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    className="flex h-12 w-12 items-center justify-center rounded-md text-gray-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
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
                        alignOffset={-5}
                        sideOffset={10}
                        className="z-modal min-w-[14rem] rounded-lg border border-dark-border bg-dark-elevated p-2 text-text-dark shadow-lg backdrop-blur-sm"
                      >
                        <DropdownMenu.Item
                          className="flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-base outline-none hover:bg-dark-hover focus:bg-dark-hover"
                          onSelect={(e) => {
                            e.preventDefault();
                            setModalOpen(true);
                          }}
                        >
                          Opret Album
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          className="flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-base outline-none hover:bg-dark-hover focus:bg-dark-hover"
                          onSelect={(e) => {
                            e.preventDefault();
                            setPasswordModalOpen(true);
                          }}
                        >
                          Skift Adgangskode
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="my-2 h-px bg-dark-border" />
                        <DropdownMenu.Item
                          className="flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-base text-error outline-none hover:bg-dark-hover focus:bg-dark-hover"
                          onSelect={() => signOut({ callbackUrl: "/login" })}
                        >
                          Log ud
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
            </>
          )}
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
