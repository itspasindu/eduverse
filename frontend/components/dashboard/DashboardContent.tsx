"use client";

import { usePathname } from "next/navigation";

export default function DashboardContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isCommunityHome = pathname === "/dashboard";

  return (
    <div className={isCommunityHome ? "mx-auto w-full max-w-lg" : "mx-auto max-w-4xl"}>
      {children}
    </div>
  );
}
