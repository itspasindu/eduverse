"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
};

function initials(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export default function UserMenu({ email, fullName, avatarUrl, role }: Props) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Server route clears cookies as fallback
    }
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/auth/signout";
    document.body.appendChild(form);
    form.submit();
  }

  const label = fullName.trim() || email.split("@")[0];
  const abbr = initials(fullName, email);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pl-1 pr-2.5 text-left transition hover:border-violet-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-violet-700"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-xs font-semibold text-white">
            {abbr}
          </span>
        )}
        <span className="hidden max-w-[120px] truncate text-sm font-medium text-zinc-700 dark:text-zinc-200 sm:inline">
          {label}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {label}
            </p>
            <p className="truncate text-xs text-zinc-500">{email}</p>
            <p className="mt-1 text-xs capitalize text-violet-600 dark:text-violet-400">
              {role}
            </p>
          </div>
          <Link
            href="/dashboard"
            role="menuitem"
            className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={() => setOpen(false)}
          >
            Community home
          </Link>
          <Link
            href="/dashboard/overview"
            role="menuitem"
            className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={() => setOpen(false)}
          >
            Overview & stats
          </Link>
          <Link
            href="/dashboard/settings"
            role="menuitem"
            className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={() => setOpen(false)}
          >
            Profile settings
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={signingOut}
            onClick={handleSignOut}
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
