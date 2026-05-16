import { requireDashboardRole } from "@/lib/dashboard-auth";
import { presentationFontVariables } from "@/lib/presentation-fonts-next";

export default async function SlidesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDashboardRole(["creator", "admin"]);
  return <div className={presentationFontVariables}>{children}</div>;
}
