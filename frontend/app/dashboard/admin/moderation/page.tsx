import AdminModerationPanel from "@/components/dashboard/AdminModerationPanel";
import type { AdminPostRow } from "@/lib/api";
import { fetchAdminPosts } from "@/lib/api-server";
import { getServerAccessToken } from "@/lib/supabase/server-auth";

export default async function AdminModerationPage() {
  const token = await getServerAccessToken();
  let posts: AdminPostRow[] = [];
  let error: string | null = null;

  if (token) {
    try {
      posts = await fetchAdminPosts(token);
    } catch {
      error = "Failed to load posts for moderation.";
    }
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Content moderation</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Review community posts and remove content that violates guidelines.
        </p>
      </header>
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      ) : (
        <AdminModerationPanel initialPosts={posts} />
      )}
    </>
  );
}
