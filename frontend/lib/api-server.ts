import type {
  AdminOverview,
  AdminPostRow,
  AdminUserRow,
  Announcement,
  DashboardData,
  Post,
  TeacherOverview,
  TeacherStudent,
} from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.detail === "string" ? body.detail : `Request failed: ${path}`,
    );
  }
  return res.json();
}

export async function fetchMe(token: string) {
  return apiGet<import("@/lib/api").UserProfile>("/me", token);
}

export async function fetchDashboard(token: string): Promise<DashboardData> {
  const res = await fetch(`${API_BASE}/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.detail === "string" ? body.detail : "Failed to load dashboard",
    );
  }
  return res.json();
}

export async function fetchFeedServer(): Promise<Post[]> {
  const res = await fetch(`${API_BASE}/posts/feed`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load feed");
  return res.json();
}

export async function fetchMyPostsServer(token: string): Promise<Post[]> {
  return apiGet<Post[]>("/posts/me", token);
}

export async function fetchAdminOverview(token: string): Promise<AdminOverview> {
  return apiGet<AdminOverview>("/admin/overview", token);
}

export async function fetchAdminUsers(token: string): Promise<AdminUserRow[]> {
  return apiGet<AdminUserRow[]>("/admin/users", token);
}

export async function fetchAdminPosts(token: string): Promise<AdminPostRow[]> {
  return apiGet<AdminPostRow[]>("/admin/posts", token);
}

export async function fetchTeacherOverview(token: string): Promise<TeacherOverview> {
  return apiGet<TeacherOverview>("/teacher/overview", token);
}

export async function fetchTeacherStudents(token: string): Promise<TeacherStudent[]> {
  return apiGet<TeacherStudent[]>("/teacher/students", token);
}

export async function fetchAnnouncementsFeed(token: string): Promise<Announcement[]> {
  return apiGet<Announcement[]>("/teacher/announcements/feed", token);
}

export async function fetchTeacherAnnouncements(token: string): Promise<Announcement[]> {
  return apiGet<Announcement[]>("/teacher/announcements", token);
}
