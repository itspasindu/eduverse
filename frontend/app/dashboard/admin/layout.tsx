import { requireDashboardRole } from "@/lib/dashboard-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDashboardRole(["admin"]);
  return children;
}
