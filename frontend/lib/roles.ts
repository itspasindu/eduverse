export type AppRole = "student" | "creator" | "teacher" | "admin";

export function normalizeRole(role: string | undefined | null): AppRole {
  if (role === "admin" || role === "teacher" || role === "creator") {
    return role;
  }
  return "student";
}

export function roleLabel(role: AppRole): string {
  const labels: Record<AppRole, string> = {
    student: "Student",
    creator: "Creator",
    teacher: "Teacher",
    admin: "Administrator",
  };
  return labels[role];
}

export function defaultDashboardPath(role: AppRole): string {
  if (role === "admin") return "/dashboard/admin";
  if (role === "teacher") return "/dashboard/teacher";
  return "/dashboard";
}
