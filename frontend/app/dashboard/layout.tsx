import DashboardSidebar from "@/components/dashboard/Sidebar";
import MobileNav from "@/components/dashboard/MobileNav";
import { fetchMe } from "@/lib/api-server";
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
      role = normalizeRole(me.role);
    } catch {
      // Fall back to JWT metadata
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <DashboardSidebar role={role} />
      <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
      <MobileNav role={role} />
    </div>
  );
}
