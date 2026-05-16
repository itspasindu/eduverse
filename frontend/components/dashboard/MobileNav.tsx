"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobileLinksForRole } from "@/lib/dashboard-nav";
import type { AppRole } from "@/lib/roles";

export default function MobileNav({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const links = mobileLinksForRole(role);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-1 flex-col items-center py-2.5 text-xs font-medium ${
              active ? "text-violet-600" : "text-zinc-500"
            }`}
          >
            <span className="text-base" aria-hidden>
              {link.icon}
            </span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
