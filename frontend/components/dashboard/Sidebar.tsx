"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinksForRole } from "@/lib/dashboard-nav";
import type { AppRole } from "@/lib/roles";
import { roleLabel } from "@/lib/roles";

export default function DashboardSidebar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const links = navLinksForRole(role);
  const section =
    role === "admin" ? "Admin" : role === "teacher" ? "Teaching" : "Workspace";

  return (
    <aside className="hidden w-56 shrink-0 border-r border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 md:block">
      <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {section}
      </p>
      <p className="mb-4 px-2 text-[10px] font-medium text-violet-600 dark:text-violet-400">
        {roleLabel(role)}
      </p>
      <nav className="space-y-1">
        {links.map((link) => {
          const active =
            pathname === link.href ||
            (link.href !== "/dashboard" &&
              link.href !== "/dashboard/admin" &&
              link.href !== "/dashboard/teacher" &&
              pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <span aria-hidden>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
