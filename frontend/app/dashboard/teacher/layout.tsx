import { requireDashboardRole } from "@/lib/dashboard-auth";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDashboardRole(["teacher", "admin"]);
  return children;
}
