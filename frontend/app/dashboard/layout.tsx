import DashboardContent from "@/components/dashboard/DashboardContent";
import DashboardSidebar from "@/components/dashboard/Sidebar";
import MobileNav from "@/components/dashboard/MobileNav";
import { fetchMe, fetchMySubscriptionServer } from "@/lib/api-server";
import { normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { getServerAccessToken } from "@/lib/supabase/server-auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let role = normalizeRole(
    (user.user_metadata?.role as string) ?? (user.app_metadata?.role as string),
  );
  const token = await getServerAccessToken();
  if (token) {
    try {
      const me = await fetchMe(token);
      if (me.is_suspended) {
        redirect("/suspended");
      }
      role = normalizeRole(me.role);
    } catch {
      // Fall back to JWT metadata
    }
  }

  if (token && role !== "admin") {
    try {
      const sub = await fetchMySubscriptionServer(token);
      if (!sub) {
        redirect("/choose-plan");
      }
    } catch {
      // Allow dashboard if subscription API unavailable
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-start">
      <DashboardSidebar role={role} />
      <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8">
        <DashboardContent>{children}</DashboardContent>
      </main>
      <MobileNav role={role} />
    </div>
  );
}
