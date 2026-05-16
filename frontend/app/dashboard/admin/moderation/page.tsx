import AdminAuditReportsPanel from "@/components/dashboard/AdminAuditReportsPanel";
import AdminModerationPanel from "@/components/dashboard/AdminModerationPanel";
import type { AdminPostRow, AuditEventRow, ContentReportRow } from "@/lib/api";
import { fetchAdminPosts } from "@/lib/api-server";
import { getServerAccessToken } from "@/lib/supabase/server-auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchAdminJson<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return [] as T;
  return res.json();
}

export default async function AdminModerationPage() {
  const token = await getServerAccessToken();
  let posts: AdminPostRow[] = [];
  let audit: AuditEventRow[] = [];
  let reports: ContentReportRow[] = [];
  let error: string | null = null;

  if (token) {
    try {
      posts = await fetchAdminPosts(token);
      audit = await fetchAdminJson<AuditEventRow[]>("/admin/audit", token);
      reports = await fetchAdminJson<ContentReportRow[]>(
        "/admin/reports",
        token,
      );
    } catch {
      error = "Failed to load moderation data.";
    }
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Security & moderation</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Review reports, audit admin actions, and remove violating posts.
        </p>
      </header>
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      ) : (
        <>
          <AdminAuditReportsPanel
            initialAudit={audit}
            initialReports={reports}
          />
          <div className="my-10 border-t border-zinc-200 dark:border-zinc-800" />
          <h2 className="mb-4 text-lg font-semibold">Community posts</h2>
          <AdminModerationPanel initialPosts={posts} />
        </>
      )}
    </>
  );
}
